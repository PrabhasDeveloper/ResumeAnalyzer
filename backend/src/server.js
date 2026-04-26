require("dotenv").config();
const app = require("./app");
const { initializeDataStore } = require("./utils/dataStore");

const PORT = process.env.PORT || 4001;

async function bootstrap() {
  try {
    await initializeDataStore();

    app.listen(PORT, () => {
      console.log(`Resume Analyzer backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize backend:", error);
    process.exit(1);
  }
}

bootstrap();