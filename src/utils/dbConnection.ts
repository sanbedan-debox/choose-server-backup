import { mongoose } from "@typegoose/typegoose";

export const connectToMongoDb = async () => {
  try {
    await mongoose.connect(process.env.DB_URI!, {
      maxPoolSize: 10,
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
