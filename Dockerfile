# Use the official Node.js image as a base image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Compile TypeScript to JavaScript
RUN npm run compile

# Expose the port your service runs on
EXPOSE 3000

# Start the application
CMD ["node", "./dist/index.js"]
