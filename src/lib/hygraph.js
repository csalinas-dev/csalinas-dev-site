import { GraphQLClient } from "graphql-request";
const endpoint = process.env.HYGRAPH_ENDPOINT;
const client = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${process.env.HYGRAPH_TOKEN}`,
  },
});
export default client;
