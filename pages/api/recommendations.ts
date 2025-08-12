// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NearTextType } from 'types';
import type { NextApiRequest, NextApiResponse } from 'next';
import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Object>
) {
  try {
    console.log('API called with method:', req.method);
    const { method } = req;
    let { query, userInterests } = req.body;
    
    console.log('Request body:', { query, userInterests });

    const weaviateClusterUrl = process.env.WEAVIATE_CLUSTER_URL?.replace("https://", "")
    console.log('Weaviate cluster URL:', weaviateClusterUrl);

    switch (method) {

      case 'POST': {
        console.log('Processing POST request...');

        let headers: { [key: string]: string } = {};

        if (process.env.OPENAI_API_KEY) {
            headers['X-OpenAI-Api-Key'] = process.env.OPENAI_API_KEY;
            console.log('OpenAI API key configured');
        }
        
        if (process.env.COHERE_API_KEY) {
            headers['X-Cohere-Api-Key'] = process.env.COHERE_API_KEY;
            console.log('Cohere API key configured');
        }
        
        console.log('Creating Weaviate client...');
        const client: WeaviateClient = weaviate.client({
          scheme: 'https',
          host: weaviateClusterUrl || 'zxzyqcyksbw7ozpm5yowa.c0.us-west2.gcp.weaviate.cloud',
          apiKey: new ApiKey(process.env.WEAVIATE_API_KEY || 'n6mdfI32xrXF3DH76i8Pwc2IajzLZop2igb6'), //READONLY API Key, ensure the environment variable is an Admin key to support writing
          headers: headers,
        });

        console.log('Building search query...');
        
        // Try nearText first if OpenAI is available, otherwise use BM25
        let recDataBuilder;
        let useNearText = false;
        
        if (process.env.OPENAI_API_KEY) {
          console.log('OpenAI API key available, will try nearText search...');
          useNearText = true;
        } else {
          console.log('No OpenAI API key, using BM25 search...');
        }
        
        if (useNearText) {
          try {
            console.log('Attempting nearText search with OpenAI...');
            
            // Combine query and interests for better semantic search
            let searchConcepts = [query];
            if (userInterests && userInterests.trim()) {
              searchConcepts.push(userInterests);
            }
            
            let nearText: NearTextType = {
              concepts: searchConcepts,
              certainty: 0.6
            };
            
            console.log('Search concepts:', searchConcepts);
            
            recDataBuilder = client.graphql
              .get()
              .withClassName('Book')
              .withFields(
                'title isbn10 isbn13 categories thumbnail description num_pages average_rating published_year authors'
              )
              .withNearText(nearText)
              .withLimit(20);
              
            console.log('Executing nearText query...');
            const recData = await recDataBuilder.do();
            console.log('NearText query successful, data length:', recData.data?.Get?.Book?.length || 0);
            
            if (process.env.COHERE_API_KEY) {
              console.log('Adding Cohere generation...');
              let generatePrompt = "Briefly describe why this book might be interesting to someone who has interests or hobbies in " + userInterests + ". the book's title is {title}, with a description: {description}, and is in the genre: {categories}. Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
              
              recDataBuilder = recDataBuilder.withGenerate({
                singlePrompt: generatePrompt,
              });
            }
            
            res.status(200).json(recData);
            return;
          } catch (error) {
            console.log('NearText search failed, falling back to BM25:', error instanceof Error ? error.message : 'Unknown error');
            // Continue to BM25 fallback
          }
        }
        
        // Fallback to BM25 search
        console.log('Using BM25 search...');
        
        // Combine query and interests for BM25 search too
        let bm25Query = query;
        if (userInterests && userInterests.trim()) {
          bm25Query = query + ' ' + userInterests;
        }
        console.log('BM25 search query:', bm25Query);
        
        recDataBuilder = client.graphql
          .get()
          .withClassName('Book')
          .withFields(
            'title isbn10 isbn13 categories thumbnail description num_pages average_rating published_year authors'
          )
          .withBm25({
            query: bm25Query
          })
          .withLimit(20);
        
        if (process.env.COHERE_API_KEY) {
          console.log('Adding Cohere generation...');
          let generatePrompt = "Briefly describe why this book might be interesting to someone who has interests or hobbies in " + userInterests + ". the book's title is {title}, with a description: {description}, and is in the genre: {categories}. Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
          
          recDataBuilder = recDataBuilder.withGenerate({
            singlePrompt: generatePrompt,
          });
        }
        
        console.log('Executing BM25 query...');
        const recData = await recDataBuilder.do();
        console.log('BM25 query successful, data length:', recData.data?.Get?.Book?.length || 0);

        res.status(200).json(recData);
        break;
      }
      default:
        res.status(400).json({ error: 'Method not allowed' });
        break;
    }
  } catch (err) {
    console.error('Detailed error in recommendations API:', err);
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    res.status(500).json({ error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' });
  }
}
