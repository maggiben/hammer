FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY bun.lock ./
RUN apt update
RUN apt install unzip
RUN curl -fsSL https://bun.sh/install | bash 
RUN $HOME/.bun/bin/bun install
COPY . .
RUN $HOME/.bun/bin/bun run build

CMD ["npm", "run", "start"]
