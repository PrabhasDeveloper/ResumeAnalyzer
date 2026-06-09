const path = require("path");
const fs = require("fs");
const Datastore = require("nedb-promises");
const { createId } = require("./id");

const dbDir = process.env.DB_DIR
  ? path.resolve(process.cwd(), process.env.DB_DIR)
  : path.resolve(process.cwd(), "data");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const usersDb = Datastore.create({
  filename: path.join(dbDir, "users.db"),
  autoload: true,
  timestampData: true,
});

const resumesDb = Datastore.create({
  filename: path.join(dbDir, "resumes.db"),
  autoload: true,
  timestampData: true,
});

const historyDb = Datastore.create({
  filename: path.join(dbDir, "history.db"),
  autoload: true,
  timestampData: true,
});

let initialized = false;

async function initializeDataStore() {
  if (initialized) {
    return;
  }

  await usersDb.ensureIndex({ fieldName: "id", unique: true });
  await usersDb.ensureIndex({ fieldName: "email", unique: true });
  await resumesDb.ensureIndex({ fieldName: "id", unique: true });
  await historyDb.ensureIndex({ fieldName: "id", unique: true });
  await historyDb.ensureIndex({ fieldName: "userId" });

  initialized = true;
}

function mapDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    ...doc,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

async function createUser({ email, passwordHash }) {
  const user = {
    id: createId("usr"),
    email,
    passwordHash,
  };

  const inserted = await usersDb.insert(user);
  return mapDoc(inserted);
}

async function findUserByEmail(email) {
  const user = await usersDb.findOne({ email });
  return mapDoc(user);
}

async function findUserById(userId) {
  const user = await usersDb.findOne({ id: userId });
  return mapDoc(user);
}

async function storeResume({ userId, filename, text, parseMetadata = null }) {
  const resume = {
    id: createId("res"),
    userId,
    filename,
    text,
    parseMetadata,
  };

  const inserted = await resumesDb.insert(resume);
  return mapDoc(inserted);
}

async function getResumeById(resumeId) {
  const resume = await resumesDb.findOne({ id: resumeId });
  return mapDoc(resume);
}

async function storeAnalysisHistory({ userId, resumeId, role, jobDescription, analysis }) {
  const record = {
    id: createId("hist"),
    userId,
    resumeId,
    role,
    jobDescription,
    analysis,
  };

  const inserted = await historyDb.insert(record);
  return mapDoc(inserted);
}

async function getAnalysisHistoryByUser(userId) {
  const records = await historyDb.find({ userId }).sort({ createdAt: -1 });
  return records.map(mapDoc);
}

module.exports = {
  initializeDataStore,
  createUser,
  findUserByEmail,
  findUserById,
  storeResume,
  getResumeById,
  storeAnalysisHistory,
  getAnalysisHistoryByUser,
};