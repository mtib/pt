# Learn European Portuguese

This is an interactive application to learn European Portuguese. It includes features like XP tracking, daily stats, and practice lists.

## Getting Started

### Development

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Environment Variables

Before running the application, ensure you have the required environment variables set up. Create a `.env` file in the root of the project and add the following variables:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PRESHARED_KEY=your_preshared_key_here
```

You can use the `.env.example` file as a reference.

### Passing the Auth Key

To use the application, you need to pass the pre-shared auth key. This can be done by appending the key to the URL hash in the following format:

```
http://localhost:3000/#auth_YOUR_AUTH_KEY
```

Replace `YOUR_AUTH_KEY` with the actual key. The application will automatically extract the key from the URL, store it in `localStorage`, and use it for API requests.

### Production

To build and run the application in production:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the application:
   ```bash
   npm start
   ```

### Docker

This project includes a `Dockerfile` for containerized deployment. To build and run the Docker container:

1. Build the Docker image:
   ```bash
   docker build -t pt-learn .
   ```

2. Run the Docker container:
   ```bash
   docker run -d \
     --name pt \
     -p 3000:3000 \
     --env-file .env \
     --restart unless-stopped \
     pt-learn
   ```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

## Features

- XP tracking to measure your progress.
- Daily stats to keep track of your learning habits.
- Practice lists to reinforce your vocabulary.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the project.
