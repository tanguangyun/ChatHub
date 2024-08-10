const { model } = require('mongoose');
const projectSchema = require('~/models/schema/projectSchema');

const Project = model('Project', projectSchema);

/**
 * Retrieve a project by ID and convert the found project document to a plain object.
 *
 * @param {string} projectId - The ID of the project to find and return as a plain object.
 * @param {string|string[]} [fieldsToSelect] - The fields to include or exclude in the returned document.
 * @returns {Promise<MongoProject>} A plain object representing the project document, or `null` if no project is found.
 */
const getProjectById = async function (projectId, fieldsToSelect = null) {
  const query = Project.findById(projectId);

  if (fieldsToSelect) {
    query.select(fieldsToSelect);
  }

  return await query.lean();
};

/**
 * Retrieve a project by name and convert the found project document to a plain object.
 * If the project with the given name doesn't exist and the name is "instance", create it and return the lean version.
 *
 * @param {string} projectName - The name of the project to find or create.
 * @param {string|string[]} [fieldsToSelect] - The fields to include or exclude in the returned document.
 * @returns {Promise<MongoProject>} A plain object representing the project document.
 */
const getProjectByName = async function (projectName, fieldsToSelect = null) {
  const query = { name: projectName };
  const update = { $setOnInsert: { name: projectName } };
  const options = {
    new: true,
    upsert: projectName === 'instance',
    lean: true,
    select: fieldsToSelect,
  };

  return await Project.findOneAndUpdate(query, update, options);
};

/**
 * Add an array of prompt group IDs to a project's promptGroupIds array, ensuring uniqueness.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {string[]} promptGroupIds - The array of prompt group IDs to add to the project.
 * @returns {Promise<MongoProject>} The updated project document.
 */
const addGroupIdsToProject = async function (projectId, promptGroupIds) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $addToSet: { promptGroupIds: { $each: promptGroupIds } } },
    { new: true },
  );
};

/**
 * Remove an array of prompt group IDs from a project's promptGroupIds array.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {string[]} promptGroupIds - The array of prompt group IDs to remove from the project.
 * @returns {Promise<MongoProject>} The updated project document.
 */
const removeGroupIdsFromProject = async function (projectId, promptGroupIds) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $pull: { promptGroupIds: { $in: promptGroupIds } } },
    { new: true },
  );
};

/**
 * Remove a prompt group ID from all projects.
 *
 * @param {string} promptGroupId - The ID of the prompt group to remove from projects.
 * @returns {Promise<void>}
 */
const removeGroupFromAllProjects = async (promptGroupId) => {
  await Project.updateMany({}, { $pull: { promptGroupIds: promptGroupId } });
};

module.exports = {
  getProjectById,
  getProjectByName,
  addGroupIdsToProject,
  removeGroupIdsFromProject,
  removeGroupFromAllProjects,
};
