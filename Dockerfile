# Dockerfile for Google Cloud Run deployment
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Cloud Run defaults to PORT 8080
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
