FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
ENV PORT=3000
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
