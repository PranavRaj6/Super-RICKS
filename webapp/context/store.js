import React, { useReducer, createContext, useEffect } from "react";

import { connectWallet } from "../utils/wallet";
import { loadAgreements } from "../utils/client";



const initialState = {
  provider: null,
  web3Provider: null,
  address: null,
  chainId: null,
  agreements: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_WEB3_PROVIDER":
      return {
        ...state,
        provider: action.provider,
        web3Provider: action.web3Provider,
        address: action.address,
        chainId: action.chainId,
      };
    case "SET_ADDRESS":
      return {
        ...state,
        address: action.address,
      };
    case "SET_CHAIN_ID":
      return {
        ...state,
        chainId: action.chainId,
      };
    case "SET_AGREEMENTS":
      return {
        ...state,
        agreements: action.agreements,
      };
    case "RESET_WEB3_PROVIDER":
      return initialState;
    default:
      throw new Error();
  }
}

const Store = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!state.provider) {
      setTimeout(() => connectWallet(dispatch), 500);
      loadAgreements(dispatch);
    }
  }, []);


  return (
    <GlobalContext.Provider value={[state, dispatch]}>
      {children}
    </GlobalContext.Provider>
  );
};

export const GlobalContext = createContext();
export default Store;