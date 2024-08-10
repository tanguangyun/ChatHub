import type { ZodIssue } from 'zod';
import type * as a from './types/assistants';
import type * as s from './schemas';
import type * as t from './types';
import { ContentTypes } from './types/assistants';
import {
  EModelEndpoint,
  openAISchema,
  googleSchema,
  bingAISchema,
  anthropicSchema,
  chatGPTBrowserSchema,
  gptPluginsSchema,
  assistantSchema,
  compactOpenAISchema,
  compactGoogleSchema,
  compactAnthropicSchema,
  compactChatGPTSchema,
  compactPluginsSchema,
  compactAssistantSchema,
} from './schemas';
import { alternateName } from './config';

type EndpointSchema =
  | typeof openAISchema
  | typeof googleSchema
  | typeof bingAISchema
  | typeof anthropicSchema
  | typeof chatGPTBrowserSchema
  | typeof gptPluginsSchema
  | typeof assistantSchema;

const endpointSchemas: Record<EModelEndpoint, EndpointSchema> = {
  [EModelEndpoint.openAI]: openAISchema,
  [EModelEndpoint.azureOpenAI]: openAISchema,
  [EModelEndpoint.custom]: openAISchema,
  [EModelEndpoint.google]: googleSchema,
  [EModelEndpoint.bingAI]: bingAISchema,
  [EModelEndpoint.anthropic]: anthropicSchema,
  [EModelEndpoint.chatGPTBrowser]: chatGPTBrowserSchema,
  [EModelEndpoint.gptPlugins]: gptPluginsSchema,
  [EModelEndpoint.assistants]: assistantSchema,
  [EModelEndpoint.azureAssistants]: assistantSchema,
};

// const schemaCreators: Record<EModelEndpoint, (customSchema: DefaultSchemaValues) => EndpointSchema> = {
//   [EModelEndpoint.google]: createGoogleSchema,
// };

/** Get the enabled endpoints from the `ENDPOINTS` environment variable */
export function getEnabledEndpoints() {
  const defaultEndpoints: string[] = [
    EModelEndpoint.openAI,
    EModelEndpoint.assistants,
    EModelEndpoint.azureAssistants,
    EModelEndpoint.azureOpenAI,
    EModelEndpoint.google,
    EModelEndpoint.bingAI,
    EModelEndpoint.chatGPTBrowser,
    EModelEndpoint.gptPlugins,
    EModelEndpoint.anthropic,
  ];

  const endpointsEnv = process.env.ENDPOINTS || '';
  let enabledEndpoints = defaultEndpoints;
  if (endpointsEnv) {
    enabledEndpoints = endpointsEnv
      .split(',')
      .filter((endpoint) => endpoint?.trim())
      .map((endpoint) => endpoint.trim());
  }
  return enabledEndpoints;
}

/** Orders an existing EndpointsConfig object based on enabled endpoint/custom ordering */
export function orderEndpointsConfig(endpointsConfig: t.TEndpointsConfig) {
  if (!endpointsConfig) {
    return {};
  }
  const enabledEndpoints = getEnabledEndpoints();
  const endpointKeys = Object.keys(endpointsConfig);
  const defaultCustomIndex = enabledEndpoints.indexOf(EModelEndpoint.custom);
  return endpointKeys.reduce(
    (accumulatedConfig: Record<string, t.TConfig | null | undefined>, currentEndpointKey) => {
      const isCustom = !(currentEndpointKey in EModelEndpoint);
      const isEnabled = enabledEndpoints.includes(currentEndpointKey);
      if (!isEnabled && !isCustom) {
        return accumulatedConfig;
      }

      const index = enabledEndpoints.indexOf(currentEndpointKey);

      if (isCustom) {
        accumulatedConfig[currentEndpointKey] = {
          order: defaultCustomIndex >= 0 ? defaultCustomIndex : 9999,
          ...(endpointsConfig[currentEndpointKey] as Omit<t.TConfig, 'order'> & { order?: number }),
        };
      } else if (endpointsConfig[currentEndpointKey]) {
        accumulatedConfig[currentEndpointKey] = {
          ...endpointsConfig[currentEndpointKey],
          order: index,
        };
      }
      return accumulatedConfig;
    },
    {},
  );
}

/** Converts an array of Zod issues into a string. */
export function errorsToString(errors: ZodIssue[]) {
  return errors
    .map((error) => {
      const field = error.path.join('.');
      const message = error.message;

      return `${field}: ${message}`;
    })
    .join(' ');
}

export const envVarRegex = /^\${(.+)}$/;

/** Extracts the value of an environment variable from a string. */
export function extractEnvVariable(value: string) {
  const envVarMatch = value.match(envVarRegex);
  if (envVarMatch) {
    return process.env[envVarMatch[1]] || value;
  }
  return value;
}

/** Resolves header values to env variables if detected */
export function resolveHeaders(headers: Record<string, string> | undefined) {
  const resolvedHeaders = { ...(headers ?? {}) };

  if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    Object.keys(headers).forEach((key) => {
      resolvedHeaders[key] = extractEnvVariable(headers[key]);
    });
  }

  return resolvedHeaders;
}

export function getFirstDefinedValue(possibleValues: string[]) {
  let returnValue;
  for (const value of possibleValues) {
    if (value) {
      returnValue = value;
      break;
    }
  }
  return returnValue;
}

export type TPossibleValues = {
  models: string[];
  secondaryModels?: string[];
};

export const parseConvo = ({
  endpoint,
  endpointType,
  conversation,
  possibleValues,
}: {
  endpoint: EModelEndpoint;
  endpointType?: EModelEndpoint;
  conversation: Partial<s.TConversation | s.TPreset>;
  possibleValues?: TPossibleValues;
  // TODO: POC for default schema
  // defaultSchema?: Partial<EndpointSchema>,
}) => {
  let schema = endpointSchemas[endpoint];

  if (!schema && !endpointType) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  } else if (!schema && endpointType) {
    schema = endpointSchemas[endpointType];
  }

  // if (defaultSchema && schemaCreators[endpoint]) {
  //   schema = schemaCreators[endpoint](defaultSchema);
  // }

  const convo = schema.parse(conversation) as s.TConversation;
  const { models, secondaryModels } = possibleValues ?? {};

  if (models && convo) {
    convo.model = getFirstDefinedValue(models) ?? convo.model;
  }

  if (secondaryModels && convo.agentOptions) {
    convo.agentOptions.model = getFirstDefinedValue(secondaryModels) ?? convo.agentOptions.model;
  }

  return convo;
};

export const getResponseSender = (endpointOption: t.TEndpointOption): string => {
  const { model, endpoint, endpointType, modelDisplayLabel, chatGptLabel, modelLabel, jailbreak } =
    endpointOption;

  if (
    [
      EModelEndpoint.openAI,
      EModelEndpoint.azureOpenAI,
      EModelEndpoint.gptPlugins,
      EModelEndpoint.chatGPTBrowser,
    ].includes(endpoint)
  ) {
    if (chatGptLabel) {
      return chatGptLabel;
    } else if (model && model.includes('gpt-3')) {
      return 'GPT-3.5';
    } else if (model && model.includes('gpt-4')) {
      return 'GPT-4';
    } else if (model && model.includes('mistral')) {
      return 'Mistral';
    }
    return alternateName[endpoint] ?? 'ChatGPT';
  }

  if (endpoint === EModelEndpoint.bingAI) {
    return jailbreak ? 'Sydney' : 'BingAI';
  }

  if (endpoint === EModelEndpoint.anthropic) {
    return modelLabel ?? 'Claude';
  }

  if (endpoint === EModelEndpoint.google) {
    if (modelLabel) {
      return modelLabel;
    } else if (model && model.includes('gemini')) {
      return 'Gemini';
    } else if (model && model.includes('code')) {
      return 'Codey';
    }

    return 'PaLM2';
  }

  if (endpoint === EModelEndpoint.custom || endpointType === EModelEndpoint.custom) {
    if (modelLabel) {
      return modelLabel;
    } else if (chatGptLabel) {
      return chatGptLabel;
    } else if (model && model.includes('mistral')) {
      return 'Mistral';
    } else if (model && model.includes('gpt-3')) {
      return 'GPT-3.5';
    } else if (model && model.includes('gpt-4')) {
      return 'GPT-4';
    } else if (modelDisplayLabel) {
      return modelDisplayLabel;
    }

    return 'AI';
  }

  return '';
};

type CompactEndpointSchema =
  | typeof compactOpenAISchema
  | typeof compactAssistantSchema
  | typeof compactGoogleSchema
  | typeof bingAISchema
  | typeof compactAnthropicSchema
  | typeof compactChatGPTSchema
  | typeof compactPluginsSchema;

const compactEndpointSchemas: Record<string, CompactEndpointSchema> = {
  [EModelEndpoint.openAI]: compactOpenAISchema,
  [EModelEndpoint.azureOpenAI]: compactOpenAISchema,
  [EModelEndpoint.custom]: compactOpenAISchema,
  [EModelEndpoint.assistants]: compactAssistantSchema,
  [EModelEndpoint.azureAssistants]: compactAssistantSchema,
  [EModelEndpoint.google]: compactGoogleSchema,
  /* BingAI needs all fields */
  [EModelEndpoint.bingAI]: bingAISchema,
  [EModelEndpoint.anthropic]: compactAnthropicSchema,
  [EModelEndpoint.chatGPTBrowser]: compactChatGPTSchema,
  [EModelEndpoint.gptPlugins]: compactPluginsSchema,
};

export const parseCompactConvo = ({
  endpoint,
  endpointType,
  conversation,
  possibleValues,
}: {
  endpoint?: EModelEndpoint;
  endpointType?: EModelEndpoint;
  conversation: Partial<s.TConversation | s.TPreset>;
  possibleValues?: TPossibleValues;
  // TODO: POC for default schema
  // defaultSchema?: Partial<EndpointSchema>,
}) => {
  if (!endpoint) {
    throw new Error(`undefined endpoint: ${endpoint}`);
  }

  let schema = compactEndpointSchemas[endpoint];

  if (!schema && !endpointType) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  } else if (!schema && endpointType) {
    schema = compactEndpointSchemas[endpointType];
  }

  const convo = schema.parse(conversation) as s.TConversation;
  // const { models, secondaryModels } = possibleValues ?? {};
  const { models } = possibleValues ?? {};

  if (models && convo) {
    convo.model = getFirstDefinedValue(models) ?? convo.model;
  }

  // if (secondaryModels && convo.agentOptions) {
  //   convo.agentOptionmodel = getFirstDefinedValue(secondaryModels) ?? convo.agentOptionmodel;
  // }

  return convo;
};

export function parseTextParts(contentParts: a.TMessageContentParts[]): string {
  let result = '';

  for (const part of contentParts) {
    if (part.type === ContentTypes.TEXT) {
      const textValue = part.text.value;

      if (
        result.length > 0 &&
        textValue.length > 0 &&
        result[result.length - 1] !== ' ' &&
        textValue[0] !== ' '
      ) {
        result += ' ';
      }
      result += textValue;
    }
  }

  return result;
}
