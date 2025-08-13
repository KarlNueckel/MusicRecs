import type { NextApiRequest, NextApiResponse } from 'next';
import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const weaviateClusterUrl = process.env.WEAVIATE_CLUSTER_URL?.replace("https://", "");

    let headers: { [key: string]: string } = {};

    if (process.env.OPENAI_API_KEY) {
        headers['X-OpenAI-Api-Key'] = process.env.OPENAI_API_KEY;
    }
    
    if (process.env.COHERE_API_KEY) {
        headers['X-Cohere-Api-Key'] = process.env.COHERE_API_KEY;
    }
    
    if (!weaviateClusterUrl || !process.env.WEAVIATE_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'WEAVIATE_CLUSTER_URL and WEAVIATE_API_KEY must be set in environment variables'
      });
    }

    const client: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateClusterUrl,
      apiKey: new ApiKey(process.env.WEAVIATE_API_KEY),
      headers: headers,
    });

    // Test the connection by getting the schema
    const schema = await client.schema.getter().do();
    
    // Get detailed class information
    const classNames = schema.classes?.map((cls: any) => cls.class) || [];
    const trackClass = schema.classes?.find((cls: any) => cls.class === 'Track');
    
    res.status(200).json({ 
      success: true, 
      message: 'Weaviate connection successful',
      classes: schema.classes?.length || 0,
      classNames: classNames,
      hasTrackClass: !!trackClass,
      trackClassDetails: trackClass || null
    });
  } catch (error) {
    console.error('Weaviate connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Weaviate connection failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
