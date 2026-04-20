'use client';

import { createContext, useContext } from 'react';

const VariablesContext = createContext({});

export const useVariables = () => useContext(VariablesContext);
export const VariablesProvider = VariablesContext.Provider;
