const { ToolCallTypes } = require('librechat-data-provider');
const validateAuthor = require('~/server/middleware/assistants/validateAuthor');
const { validateAndUpdateTool } = require('~/server/services/ActionService');
const { updateAssistantDoc } = require('~/models/Assistant');
const { getOpenAIClient } = require('./helpers');
const { logger } = require('~/config');

/**
 * Create an assistant.
 * @route POST /assistants
 * @param {AssistantCreateParams} req.body - The assistant creation parameters.
 * @returns {Assistant} 201 - success response - application/json
 */
const createAssistant = async (req, res) => {
  try {
    /** @type {{ openai: OpenAIClient }} */
    const { openai } = await getOpenAIClient({ req, res });

    const { tools = [], endpoint, ...assistantData } = req.body;
    assistantData.tools = tools
      .map((tool) => {
        if (typeof tool !== 'string') {
          return tool;
        }

        return req.app.locals.availableTools[tool];
      })
      .filter((tool) => tool);

    let azureModelIdentifier = null;
    if (openai.locals?.azureOptions) {
      azureModelIdentifier = assistantData.model;
      assistantData.model = openai.locals.azureOptions.azureOpenAIApiDeploymentName;
    }

    assistantData.metadata = {
      author: req.user.id,
      endpoint,
    };

    const assistant = await openai.beta.assistants.create(assistantData);
    const promise = updateAssistantDoc({ assistant_id: assistant.id }, { user: req.user.id });
    if (azureModelIdentifier) {
      assistant.model = azureModelIdentifier;
    }
    await promise;
    logger.debug('/assistants/', assistant);
    res.status(201).json(assistant);
  } catch (error) {
    logger.error('[/assistants] Error creating assistant', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Modifies an assistant.
 * @param {object} params
 * @param {Express.Request} params.req
 * @param {OpenAIClient} params.openai
 * @param {string} params.assistant_id
 * @param {AssistantUpdateParams} params.updateData
 * @returns {Promise<Assistant>} The updated assistant.
 */
const updateAssistant = async ({ req, openai, assistant_id, updateData }) => {
  await validateAuthor({ req, openai });
  const tools = [];

  let hasFileSearch = false;
  for (const tool of updateData.tools ?? []) {
    let actualTool = typeof tool === 'string' ? req.app.locals.availableTools[tool] : tool;

    if (!actualTool) {
      continue;
    }

    if (actualTool.type === ToolCallTypes.FILE_SEARCH) {
      hasFileSearch = true;
    }

    if (!actualTool.function) {
      tools.push(actualTool);
      continue;
    }

    const updatedTool = await validateAndUpdateTool({ req, tool: actualTool, assistant_id });
    if (updatedTool) {
      tools.push(updatedTool);
    }
  }

  if (hasFileSearch && !updateData.tool_resources) {
    const assistant = await openai.beta.assistants.retrieve(assistant_id);
    updateData.tool_resources = assistant.tool_resources ?? null;
  }

  if (hasFileSearch && !updateData.tool_resources?.file_search) {
    updateData.tool_resources = {
      ...(updateData.tool_resources ?? {}),
      file_search: {
        vector_store_ids: [],
      },
    };
  }

  updateData.tools = tools;

  if (openai.locals?.azureOptions && updateData.model) {
    updateData.model = openai.locals.azureOptions.azureOpenAIApiDeploymentName;
  }

  return await openai.beta.assistants.update(assistant_id, updateData);
};

/**
 * Modifies an assistant with the resource file id.
 * @param {object} params
 * @param {Express.Request} params.req
 * @param {OpenAIClient} params.openai
 * @param {string} params.assistant_id
 * @param {string} params.tool_resource
 * @param {string} params.file_id
 * @param {AssistantUpdateParams} params.updateData
 * @returns {Promise<Assistant>} The updated assistant.
 */
const addResourceFileId = async ({ req, openai, assistant_id, tool_resource, file_id }) => {
  const assistant = await openai.beta.assistants.retrieve(assistant_id);
  const { tool_resources = {} } = assistant;
  if (tool_resources[tool_resource]) {
    tool_resources[tool_resource].file_ids.push(file_id);
  } else {
    tool_resources[tool_resource] = { file_ids: [file_id] };
  }

  delete assistant.id;
  return await updateAssistant({
    req,
    openai,
    assistant_id,
    updateData: { tools: assistant.tools, tool_resources },
  });
};

/**
 * Deletes a file ID from an assistant's resource.
 * @param {object} params
 * @param {Express.Request} params.req
 * @param {OpenAIClient} params.openai
 * @param {string} params.assistant_id
 * @param {string} [params.tool_resource]
 * @param {string} params.file_id
 * @param {AssistantUpdateParams} params.updateData
 * @returns {Promise<Assistant>} The updated assistant.
 */
const deleteResourceFileId = async ({ req, openai, assistant_id, tool_resource, file_id }) => {
  const assistant = await openai.beta.assistants.retrieve(assistant_id);
  const { tool_resources = {} } = assistant;

  if (tool_resource && tool_resources[tool_resource]) {
    const resource = tool_resources[tool_resource];
    const index = resource.file_ids.indexOf(file_id);
    if (index !== -1) {
      resource.file_ids.splice(index, 1);
    }
  } else {
    for (const resourceKey in tool_resources) {
      const resource = tool_resources[resourceKey];
      const index = resource.file_ids.indexOf(file_id);
      if (index !== -1) {
        resource.file_ids.splice(index, 1);
        break;
      }
    }
  }

  delete assistant.id;
  return await updateAssistant({
    req,
    openai,
    assistant_id,
    updateData: { tools: assistant.tools, tool_resources },
  });
};

/**
 * Modifies an assistant.
 * @route PATCH /assistants/:id
 * @param {object} req - Express Request
 * @param {object} req.params - Request params
 * @param {string} req.params.id - Assistant identifier.
 * @param {AssistantUpdateParams} req.body - The assistant update parameters.
 * @returns {Assistant} 200 - success response - application/json
 */
const patchAssistant = async (req, res) => {
  try {
    const { openai } = await getOpenAIClient({ req, res });
    const assistant_id = req.params.id;
    const { endpoint: _e, ...updateData } = req.body;
    updateData.tools = updateData.tools ?? [];
    const updatedAssistant = await updateAssistant({ req, openai, assistant_id, updateData });
    res.json(updatedAssistant);
  } catch (error) {
    logger.error('[/assistants/:id] Error updating assistant', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  patchAssistant,
  createAssistant,
  updateAssistant,
  addResourceFileId,
  deleteResourceFileId,
};
