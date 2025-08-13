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
        if (!weaviateClusterUrl || !process.env.WEAVIATE_API_KEY) {
          throw new Error('WEAVIATE_CLUSTER_URL and WEAVIATE_API_KEY must be set in environment variables');
        }

        const client: WeaviateClient = weaviate.client({
          scheme: 'https',
          host: weaviateClusterUrl,
          apiKey: new ApiKey(process.env.WEAVIATE_API_KEY),
          headers: headers,
        });

        // First, let's check what collections exist
        console.log('Checking available collections...');
        const schema = await client.schema.getter().do();
        const classNames = schema.classes?.map((cls: any) => cls.class) || [];
        console.log('Available classes:', classNames);
        
        // Prioritize Track collection for music recommendations
        const targetClass = classNames.includes('Track') ? 'Track' : 
                           classNames.includes('Book') ? 'Book' : 
                           classNames.includes('WeaviateEmbeddingBooks') ? 'WeaviateEmbeddingBooks' :
                           classNames[0]; // fallback to first available class
        
        if (!targetClass) {
          throw new Error('No collections found in Weaviate instance');
        }
        
        console.log('Using collection:', targetClass);
        
        // Let's also check how many objects are in the collection
        try {
          const countResult = await client.graphql
            .aggregate()
            .withClassName(targetClass)
            .withFields('total')
            .do();
          console.log('Total objects in collection:', countResult.data?.Aggregate?.[targetClass]?.[0]?.total || 0);
        } catch (error) {
          console.log('Could not get collection count:', error);
        }

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
            
            // Use different fields based on the collection type
            const fields = targetClass === 'Track' 
              ? 'name artists genres album_image_url album popularity duration_ms release_date track_url spotify_id'
              : targetClass === 'Book' || targetClass === 'WeaviateEmbeddingBooks'
              ? 'title authors categories description thumbnail published_year average_rating num_pages isbn10 isbn13 subtitle ratings_count'
              : 'title authors categories description thumbnail published_year average_rating num_pages isbn10 isbn13';
            
            recDataBuilder = client.graphql
              .get()
              .withClassName(targetClass)
              .withFields(fields)
              .withNearText(nearText)
              .withLimit(20);
              
            console.log('Executing nearText query...');
            const recData = await recDataBuilder.do();
            console.log('NearText query successful, data length:', recData.data?.Get?.[targetClass]?.length || 0);
            
                    // Temporarily disable generation to avoid the Cohere client error
        // if (process.env.COHERE_API_KEY) {
        //   console.log('Adding Cohere generation...');
        //   let generatePrompt;
        //   
        //   if (targetClass === 'Track') {
        //     generatePrompt = "Briefly describe why this track might be interesting to someone who has interests or hobbies in " + userInterests + ". the track's name is {name}, by {artists}, from the album {album}, and is in the genre: {genres}. Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
        //   } else if (targetClass === 'Book' || targetClass === 'WeaviateEmbeddingBooks') {
        //     generatePrompt = "Briefly describe why this book might be interesting to someone who has interests or hobbies in " + userInterests + ". the book's title is {title}, by {authors}, and is in the category: {categories}. Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
        //   } else {
        //     generatePrompt = "Briefly describe why this item might be interesting to someone who has interests or hobbies in " + userInterests + ". Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
        //   }
        //   
        //   recDataBuilder = recDataBuilder.withGenerate({
        //     singlePrompt: generatePrompt,
        //   });
        // }
            
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
        
        // If the query is too specific, let's try a broader search
        if (bm25Query.trim() === 'fiction') {
          console.log('Query is "fiction", trying broader search...');
          // Try searching for any tracks that might be related to fiction/books
          bm25Query = 'ambient music relaxation';
        }
        
        // Use different fields based on the collection type
        const fields = targetClass === 'Track' 
          ? 'name artists genres album_image_url album popularity duration_ms release_date track_url spotify_id'
          : targetClass === 'Book' || targetClass === 'WeaviateEmbeddingBooks'
          ? 'title authors categories description thumbnail published_year average_rating num_pages isbn10 isbn13 subtitle ratings_count'
          : 'title authors categories description thumbnail published_year average_rating num_pages isbn10 isbn13';
        
        recDataBuilder = client.graphql
          .get()
          .withClassName(targetClass)
          .withFields(fields)
          .withBm25({
            query: bm25Query
          })
          .withLimit(20);
        
        // Temporarily disable generation to avoid the Cohere client error
        // if (process.env.COHERE_API_KEY) {
        //   console.log('Adding Cohere generation...');
        //   let generatePrompt;
        //   
        //   if (targetClass === 'Track') {
        //     generatePrompt = "Briefly describe why this track might be interesting to someone who has interests or hobbies in " + userInterests + ". the track's name is {name}, by {artists}, from the album {album}, and is in the genre: {genres}. Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
        //   } else if (targetClass === 'Book' || targetClass === 'WeaviateEmbeddingBooks') {
        //     generatePrompt = "Briefly describe why this book might be interesting to someone who has interests or hobbies in " + userInterests + ". the book's title is {title}, by {authors}, and is in the category: {categories}. Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
        //   } else {
        //     generatePrompt = "Briefly describe why this item might be interesting to someone who has interests or hobbies in " + userInterests + ". Don't make up anything that wasn't given in this prompt and don't ask how you can help.";
        //   }
        //   
        //   recDataBuilder = recDataBuilder.withGenerate({
        //     singlePrompt: generatePrompt,
        //   });
        // }
        
        console.log('Executing BM25 query...');
        const recData = await recDataBuilder.do();
        console.log('BM25 query successful, data length:', recData.data?.Get?.[targetClass]?.length || 0);
        
        // If no results, try getting some random tracks
        if (!recData.data?.Get?.[targetClass] || recData.data.Get[targetClass].length === 0) {
          console.log('No results from search, trying to get random tracks...');
          try {
            const randomData = await client.graphql
              .get()
              .withClassName(targetClass)
              .withFields(fields)
              .withLimit(20)
              .do();
            console.log('Random tracks found:', randomData.data?.Get?.[targetClass]?.length || 0);
            res.status(200).json(randomData);
            return;
          } catch (error) {
            console.log('Failed to get random tracks:', error);
          }
        }

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
