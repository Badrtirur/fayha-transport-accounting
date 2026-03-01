FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "dist", "-s", "-l", "tcp://0.0.0.0:3000"]
