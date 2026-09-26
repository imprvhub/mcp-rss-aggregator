# Optional container image for self-hosting this stdio MCP server (docker run -i).
# Smithery distributes this server as an MCPB bundle and does not build this file.
# Build stage
FROM node:lts-alpine AS build
WORKDIR /app

# Copy dependency manifests and TypeScript config
COPY package.json package-lock.json tsconfig.json ./

# Copy TypeScript source files and public assets
COPY src ./src
COPY public ./public

# Install dependencies and build
RUN npm install
RUN npm run build

# Runtime stage
FROM node:lts-alpine AS runtime
WORKDIR /app

# Copy built artifacts and production modules
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public

# Default command to start the MCP server
CMD ["node", "build/index.js"]