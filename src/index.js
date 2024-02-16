import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { Routes } from "./Routes";
import "./index.css";

// Initialize Apollo Client
const client = new ApolloClient({
  uri: "https://api-us-west-2.hygraph.com/v2/clsmqzrsn0hv001upp8leears/master",
  cache: new InMemoryCache(),
});

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <Routes />
    </ApolloProvider>
  </React.StrictMode>
);
