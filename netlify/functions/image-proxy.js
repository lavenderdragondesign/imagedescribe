const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { type, token, model } = event.queryStringParameters;

  if (!token || !model) {
    return { statusCode: 400, body: 'Missing token or model query parameter.' };
  }

  const body = event.body; // This will be the raw image data

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': type, // Use the content type passed from the client
      },
      method: 'POST',
      body: Buffer.from(body, 'base64'), // Netlify functions base64 encode binary bodies
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        statusCode: response.status,
        body: `Hugging Face API error: ${response.status}, ${errorBody}`,
      };
    }

    const result = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: `Internal Server Error: ${error.message}`,
    };
  }
};
