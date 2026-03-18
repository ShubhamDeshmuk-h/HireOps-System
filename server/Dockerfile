# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy only package files to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port if needed (optional)
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
