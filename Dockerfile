# 1. Use the official lightweight Node environment
FROM node:20-alpine

# 2. Establish our workspace inside the container
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy all project source code files
COPY . .

# 5. Build your Vite frontend assets and transpile the Express server
RUN npm run build

# 6. Expose the port (Render automatically injects the PORT env variable and maps it)
EXPOSE 3000

# 7. Start your Express unified backend server (runs dist/server.cjs compiled during build phase)
CMD ["node", "dist/server.cjs"]
