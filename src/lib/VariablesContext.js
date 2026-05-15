'use client';

import { createContext, useContext } from 'react';

const VariablesContext = createContext({});
const ExpressionsContext = createContext({
  expressions: {},
  setExpression: () => {},
  clearExpression: () => {},
});

export const useVariables = () => useContext(VariablesContext);
export const useExpressions = () => useContext(ExpressionsContext);
export const VariablesProvider = VariablesContext.Provider;
export const ExpressionsProvider = ExpressionsContext.Provider;
