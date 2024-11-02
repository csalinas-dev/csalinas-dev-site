import { GraphQLClient } from "graphql-request";

const hygraph = new GraphQLClient(process.env.HYGRAPH_ENDPOINT, {
  headers: {
    authorization: `Bearer ${process.env.HYGRAPH_TOKEN}`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  },
});

export default hygraph;
