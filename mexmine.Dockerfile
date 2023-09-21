FROM node:18.1.0

WORKDIR /mexmine

COPY package.json .

RUN npm install

COPY . .

CMD ["node", "bitmex_ws.js"]
