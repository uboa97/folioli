'use client';

import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PortfolioNode from '@/components/PortfolioNode';
import RotateAssetNode from '@/components/RotateAssetNode';
import SellAssetNode from '@/components/SellAssetNode';
import BuyAssetNode from '@/components/BuyAssetNode';
import PriceTargetNode from '@/components/PriceTargetNode';
import ProjectedPortfolioNode from '@/components/ProjectedPortfolioNode';
import { fetchPrice } from '@/lib/fetchPrice';

const nodeTypes = {
  portfolio: PortfolioNode,
  rotate: RotateAssetNode,
  sell: SellAssetNode,
  buy: BuyAssetNode,
  priceTarget: PriceTargetNode,
  projected: ProjectedPortfolioNode,
};

const INITIAL_PORTFOLIO_ID = 'portfolio-1';
const STORAGE_KEY = 'folioli-state';

const defaultNodes = [
  {
    id: INITIAL_PORTFOLIO_ID,
    type: 'portfolio',
    position: { x: 100, y: 150 },
    data: { holdings: [] },
  },
];

function loadState() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return null;
}

function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export default function Home() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [portfolioHoldings, setPortfolioHoldings] = useState({ [INITIAL_PORTFOLIO_ID]: [] });
  const [portfolioCount, setPortfolioCount] = useState(1);
  const [rotations, setRotations] = useState({});
  const [rotationInputs, setRotationInputs] = useState({});
  const [rotationCount, setRotationCount] = useState(0);
  const [sells, setSells] = useState({});
  const [sellInputs, setSellInputs] = useState({});
  const [sellCount, setSellCount] = useState(0);
  const [buys, setBuys] = useState({});
  const [buyInputs, setBuyInputs] = useState({});
  const [buyCount, setBuyCount] = useState(0);
  const [priceTargets, setPriceTargets] = useState({});
  const [priceTargetInputs, setPriceTargetInputs] = useState({});
  const [priceTargetCount, setPriceTargetCount] = useState(0);
  const [projectedForPortfolio, setProjectedForPortfolio] = useState({});
  const [projectedCount, setProjectedCount] = useState(0);

  const isInitialMount = useRef(true);

  // Refresh prices for all holdings
  const refreshPrices = useCallback(async (holdingsToRefresh) => {
    if (!holdingsToRefresh || holdingsToRefresh.length === 0) return holdingsToRefresh;

    const refreshed = await Promise.all(
      holdingsToRefresh.map(async (holding) => {
        // Don't refresh USD/CASH
        if (holding.ticker === 'USD' || holding.ticker === 'CASH') return holding;
        const { price, type } = await fetchPrice(holding.ticker);
        return {
          ...holding,
          price: price ?? holding.price,
          type: type !== 'unknown' ? type : holding.type,
          value: price ? price * holding.amount : holding.value,
        };
      })
    );
    return refreshed;
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    const loadAndRefresh = async () => {
      const saved = loadState();
      if (saved) {
        if (saved.nodes) setNodes(saved.nodes);
        if (saved.edges) setEdges(saved.edges);
        if (saved.rotationCount !== undefined) setRotationCount(saved.rotationCount);
        if (saved.sellCount !== undefined) setSellCount(saved.sellCount);
        if (saved.buyCount !== undefined) setBuyCount(saved.buyCount);
        if (saved.priceTargetCount !== undefined) setPriceTargetCount(saved.priceTargetCount);
        if (saved.portfolioCount !== undefined) setPortfolioCount(saved.portfolioCount);
        if (saved.projectedForPortfolio) setProjectedForPortfolio(saved.projectedForPortfolio);
        if (saved.projectedCount !== undefined) setProjectedCount(saved.projectedCount);

        // Load with stale prices first for immediate display
        // Support both old format (holdings array) and new format (portfolioHoldings map)
        if (saved.portfolioHoldings) {
          setPortfolioHoldings(saved.portfolioHoldings);
        } else if (saved.holdings) {
          // Migrate old format
          setPortfolioHoldings({ [INITIAL_PORTFOLIO_ID]: saved.holdings });
        }
        if (saved.rotations) setRotations(saved.rotations);
        if (saved.rotationInputs) setRotationInputs(saved.rotationInputs);
        if (saved.sells) setSells(saved.sells);
        if (saved.sellInputs) setSellInputs(saved.sellInputs);
        if (saved.buys) setBuys(saved.buys);
        if (saved.buyInputs) setBuyInputs(saved.buyInputs);
        if (saved.priceTargets) setPriceTargets(saved.priceTargets);
        if (saved.priceTargetInputs) setPriceTargetInputs(saved.priceTargetInputs);

        setIsHydrated(true);

        // Refresh prices in background after initial render for all portfolios
        const holdingsToRefresh = saved.portfolioHoldings || (saved.holdings ? { [INITIAL_PORTFOLIO_ID]: saved.holdings } : null);
        if (holdingsToRefresh) {
          const refreshedPortfolios = {};
          for (const [portfolioId, holdingsList] of Object.entries(holdingsToRefresh)) {
            if (holdingsList && holdingsList.length > 0) {
              refreshedPortfolios[portfolioId] = await refreshPrices(holdingsList);
            } else {
              refreshedPortfolios[portfolioId] = holdingsList;
            }
          }
          setPortfolioHoldings(refreshedPortfolios);
        }

        // Refresh rotation input prices
        if (saved.rotationInputs && Object.keys(saved.rotationInputs).length > 0) {
          const refreshedInputs = {};
          for (const [nodeId, inputs] of Object.entries(saved.rotationInputs)) {
            if (inputs.toAsset) {
              const { price, type } = await fetchPrice(inputs.toAsset);
              refreshedInputs[nodeId] = {
                ...inputs,
                toPrice: price ?? inputs.toPrice,
                toType: type !== 'unknown' ? type : inputs.toType,
              };
            } else {
              refreshedInputs[nodeId] = inputs;
            }
          }
          setRotationInputs(refreshedInputs);
        }

        // Refresh buy input prices
        if (saved.buyInputs && Object.keys(saved.buyInputs).length > 0) {
          const refreshedBuyInputs = {};
          for (const [nodeId, inputs] of Object.entries(saved.buyInputs)) {
            if (inputs.toAsset) {
              const { price, type } = await fetchPrice(inputs.toAsset);
              refreshedBuyInputs[nodeId] = {
                ...inputs,
                toPrice: price ?? inputs.toPrice,
                toType: type !== 'unknown' ? type : inputs.toType,
              };
            } else {
              refreshedBuyInputs[nodeId] = inputs;
            }
          }
          setBuyInputs(refreshedBuyInputs);
        }
      } else {
        setIsHydrated(true);
      }
    };

    loadAndRefresh();
  }, [setNodes, setEdges, refreshPrices]);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Strip callbacks from nodes before saving
    const nodesToSave = nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {},
    }));

    saveState({
      nodes: nodesToSave,
      edges,
      portfolioHoldings,
      portfolioCount,
      rotations,
      rotationInputs,
      rotationCount,
      sells,
      sellInputs,
      sellCount,
      buys,
      buyInputs,
      buyCount,
      priceTargets,
      priceTargetInputs,
      priceTargetCount,
      projectedForPortfolio,
      projectedCount,
    });
  }, [isHydrated, nodes, edges, portfolioHoldings, portfolioCount, rotations, rotationInputs, rotationCount, sells, sellInputs, sellCount, buys, buyInputs, buyCount, priceTargets, priceTargetInputs, priceTargetCount, projectedForPortfolio, projectedCount]);

  // Check if a specific portfolio should have a projected node (has any action nodes connected)
  const getActionNodesForPortfolio = useCallback((portfolioId, edgesList) => {
    return edgesList
      .filter(e => e.source === portfolioId)
      .map(e => e.target)
      .filter(targetId =>
        targetId.startsWith('rotate-') ||
        targetId.startsWith('sell-') ||
        targetId.startsWith('buy-') ||
        targetId.startsWith('priceTarget-')
      );
  }, []);

  // Handle node changes and clean up when nodes are deleted
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);

    // Check for deleted portfolio nodes
    const deletedPortfolioIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('portfolio-'))
      .map(change => change.id);

    // Check for deleted rotation nodes
    const deletedRotateIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('rotate-'))
      .map(change => change.id);

    // Check for deleted sell nodes
    const deletedSellIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('sell-'))
      .map(change => change.id);

    // Check for deleted buy nodes
    const deletedBuyIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('buy-'))
      .map(change => change.id);

    // Check for deleted price target nodes
    const deletedPriceTargetIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('priceTarget-'))
      .map(change => change.id);

    if (deletedPortfolioIds.length > 0) {
      setPortfolioHoldings(prev => {
        const updated = { ...prev };
        deletedPortfolioIds.forEach(id => delete updated[id]);
        return updated;
      });
      // Also remove projected nodes for deleted portfolios
      setProjectedForPortfolio(prev => {
        const updated = { ...prev };
        const projectedToRemove = [];
        deletedPortfolioIds.forEach(id => {
          if (updated[id]) {
            projectedToRemove.push(updated[id]);
            delete updated[id];
          }
        });
        if (projectedToRemove.length > 0) {
          setNodes(prevNodes => prevNodes.filter(n => !projectedToRemove.includes(n.id)));
        }
        return updated;
      });
      setEdges(prev => prev.filter(edge =>
        !deletedPortfolioIds.includes(edge.source) && !deletedPortfolioIds.includes(edge.target)
      ));
    }

    if (deletedRotateIds.length > 0) {
      setRotations(prev => {
        const updated = { ...prev };
        deletedRotateIds.forEach(id => delete updated[id]);
        return updated;
      });
      setRotationInputs(prev => {
        const updated = { ...prev };
        deletedRotateIds.forEach(id => delete updated[id]);
        return updated;
      });
      setEdges(prev => prev.filter(edge =>
        !deletedRotateIds.includes(edge.source) && !deletedRotateIds.includes(edge.target)
      ));
    }

    if (deletedSellIds.length > 0) {
      setSells(prev => {
        const updated = { ...prev };
        deletedSellIds.forEach(id => delete updated[id]);
        return updated;
      });
      setSellInputs(prev => {
        const updated = { ...prev };
        deletedSellIds.forEach(id => delete updated[id]);
        return updated;
      });
      setEdges(prev => prev.filter(edge =>
        !deletedSellIds.includes(edge.source) && !deletedSellIds.includes(edge.target)
      ));
    }

    if (deletedBuyIds.length > 0) {
      setBuys(prev => {
        const updated = { ...prev };
        deletedBuyIds.forEach(id => delete updated[id]);
        return updated;
      });
      setBuyInputs(prev => {
        const updated = { ...prev };
        deletedBuyIds.forEach(id => delete updated[id]);
        return updated;
      });
      setEdges(prev => prev.filter(edge =>
        !deletedBuyIds.includes(edge.source) && !deletedBuyIds.includes(edge.target)
      ));
    }

    if (deletedPriceTargetIds.length > 0) {
      setPriceTargets(prev => {
        const updated = { ...prev };
        deletedPriceTargetIds.forEach(id => delete updated[id]);
        return updated;
      });
      setPriceTargetInputs(prev => {
        const updated = { ...prev };
        deletedPriceTargetIds.forEach(id => delete updated[id]);
        return updated;
      });
      setEdges(prev => prev.filter(edge =>
        !deletedPriceTargetIds.includes(edge.source) && !deletedPriceTargetIds.includes(edge.target)
      ));
    }

    // Remove projected nodes for portfolios that no longer have action nodes
    if (deletedRotateIds.length > 0 || deletedSellIds.length > 0 || deletedBuyIds.length > 0 || deletedPriceTargetIds.length > 0) {
      const allDeletedActionIds = [...deletedRotateIds, ...deletedSellIds, ...deletedBuyIds, ...deletedPriceTargetIds];

      setEdges(prevEdges => {
        // Find which portfolios had these deleted action nodes
        const affectedPortfolios = new Set();
        prevEdges.forEach(edge => {
          if (allDeletedActionIds.includes(edge.target) && edge.source.startsWith('portfolio-')) {
            affectedPortfolios.add(edge.source);
          }
        });

        // Check if each affected portfolio still has action nodes after deletion
        const remainingEdges = prevEdges.filter(edge =>
          !allDeletedActionIds.includes(edge.source) && !allDeletedActionIds.includes(edge.target)
        );

        affectedPortfolios.forEach(portfolioId => {
          const remainingActions = getActionNodesForPortfolio(portfolioId, remainingEdges);
          if (remainingActions.length === 0) {
            // Remove this portfolio's projected node
            setProjectedForPortfolio(prev => {
              const projectedId = prev[portfolioId];
              if (projectedId) {
                setNodes(prevNodes => prevNodes.filter(n => n.id !== projectedId));
                const { [portfolioId]: _, ...rest } = prev;
                return rest;
              }
              return prev;
            });
          }
        });

        return remainingEdges;
      });
    }
  }, [onNodesChange, setEdges, setNodes, getActionNodesForPortfolio]);

  // Helper to remove an action node and clean up its portfolio's projected node if needed
  const removeActionNode = useCallback((nodeId, cleanupState) => {
    // Find which portfolio this action node belongs to
    let sourcePortfolioId = null;
    setEdges(prevEdges => {
      const sourceEdge = prevEdges.find(e => e.target === nodeId && e.source.startsWith('portfolio-'));
      if (sourceEdge) {
        sourcePortfolioId = sourceEdge.source;
      }
      return prevEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
    });

    setNodes(prev => prev.filter(n => n.id !== nodeId));

    cleanupState();

    // Check if the source portfolio still has action nodes
    if (sourcePortfolioId) {
      setTimeout(() => {
        setEdges(currentEdges => {
          const remainingActions = getActionNodesForPortfolio(sourcePortfolioId, currentEdges);
          if (remainingActions.length === 0) {
            setProjectedForPortfolio(prev => {
              const projectedId = prev[sourcePortfolioId];
              if (projectedId) {
                setNodes(prevNodes => prevNodes.filter(n => n.id !== projectedId));
                const { [sourcePortfolioId]: _, ...rest } = prev;
                return rest;
              }
              return prev;
            });
          }
          return currentEdges;
        });
      }, 0);
    }
  }, [setNodes, setEdges, getActionNodesForPortfolio]);

  // Remove a rotation node
  const handleRemoveRotation = useCallback((nodeId) => {
    removeActionNode(nodeId, () => {
      setRotations(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
      setRotationInputs(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
    });
  }, [removeActionNode]);

  // Remove a sell node
  const handleRemoveSell = useCallback((nodeId) => {
    removeActionNode(nodeId, () => {
      setSells(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
      setSellInputs(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
    });
  }, [removeActionNode]);

  const handleHoldingsChange = useCallback((nodeId, newHoldings) => {
    setPortfolioHoldings(prev => ({
      ...prev,
      [nodeId]: newHoldings,
    }));
  }, []);

  // Duplicate a portfolio node with its holdings
  const handleDuplicatePortfolio = useCallback((sourceNodeId) => {
    const newPortfolioId = `portfolio-${portfolioCount + 1}`;
    setPortfolioCount(prev => prev + 1);

    // Find the source node position
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    const sourcePosition = sourceNode?.position || { x: 100, y: 150 };

    // Create new portfolio node offset from source
    setNodes(prev => {
      const newNodes = [...prev];
      newNodes.push({
        id: newPortfolioId,
        type: 'portfolio',
        position: { x: sourcePosition.x, y: sourcePosition.y + 400 },
        data: {},
      });
      return newNodes;
    });

    // Copy holdings from source portfolio
    const sourceHoldings = portfolioHoldings[sourceNodeId] || [];
    setPortfolioHoldings(prev => ({
      ...prev,
      [newPortfolioId]: sourceHoldings.map(h => ({ ...h })),
    }));
  }, [portfolioCount, nodes, portfolioHoldings, setNodes]);

  // Remove a portfolio node and all its connected nodes
  const handleRemovePortfolio = useCallback((portfolioId) => {
    // Find all action nodes connected to this portfolio
    const connectedActionIds = edges
      .filter(e => e.source === portfolioId)
      .map(e => e.target)
      .filter(id =>
        id.startsWith('rotate-') ||
        id.startsWith('sell-') ||
        id.startsWith('buy-') ||
        id.startsWith('priceTarget-')
      );

    // Get the projected node for this portfolio
    const projectedId = projectedForPortfolio[portfolioId];

    // Remove the portfolio node, its action nodes, and projected node
    setNodes(prev => prev.filter(n =>
      n.id !== portfolioId &&
      !connectedActionIds.includes(n.id) &&
      n.id !== projectedId
    ));

    // Remove all related edges
    setEdges(prev => prev.filter(e =>
      e.source !== portfolioId &&
      e.target !== portfolioId &&
      !connectedActionIds.includes(e.source) &&
      !connectedActionIds.includes(e.target)
    ));

    // Clean up holdings
    setPortfolioHoldings(prev => {
      const { [portfolioId]: _, ...rest } = prev;
      return rest;
    });

    // Clean up projected mapping
    setProjectedForPortfolio(prev => {
      const { [portfolioId]: _, ...rest } = prev;
      return rest;
    });

    // Clean up action node states
    setRotations(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
    setRotationInputs(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
    setSells(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
    setSellInputs(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
    setBuys(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
    setBuyInputs(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
    setPriceTargets(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
    setPriceTargetInputs(prev => {
      const updated = { ...prev };
      connectedActionIds.forEach(id => delete updated[id]);
      return updated;
    });
  }, [edges, projectedForPortfolio, setNodes, setEdges]);

  const handleRotationChange = useCallback((nodeId, rotation) => {
    setRotations(prev => {
      if (rotation === null) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nodeId]: rotation };
    });
  }, []);

  const handleRotationInputChange = useCallback((nodeId, inputs) => {
    setRotationInputs(prev => ({
      ...prev,
      [nodeId]: inputs,
    }));
  }, []);

  const handleSellChange = useCallback((nodeId, sell) => {
    setSells(prev => {
      if (sell === null) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nodeId]: sell };
    });
  }, []);

  const handleSellInputChange = useCallback((nodeId, inputs) => {
    setSellInputs(prev => ({
      ...prev,
      [nodeId]: inputs,
    }));
  }, []);

  const handleBuyChange = useCallback((nodeId, buy) => {
    setBuys(prev => {
      if (buy === null) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nodeId]: buy };
    });
  }, []);

  const handleBuyInputChange = useCallback((nodeId, inputs) => {
    setBuyInputs(prev => ({
      ...prev,
      [nodeId]: inputs,
    }));
  }, []);

  // Remove a buy node
  const handleRemoveBuy = useCallback((nodeId) => {
    removeActionNode(nodeId, () => {
      setBuys(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
      setBuyInputs(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
    });
  }, [removeActionNode]);

  const handlePriceTargetChange = useCallback((nodeId, priceTarget) => {
    setPriceTargets(prev => {
      if (priceTarget === null) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nodeId]: priceTarget };
    });
  }, []);

  const handlePriceTargetInputChange = useCallback((nodeId, inputs) => {
    setPriceTargetInputs(prev => ({
      ...prev,
      [nodeId]: inputs,
    }));
  }, []);

  // Remove a price target node
  const handleRemovePriceTarget = useCallback((nodeId) => {
    removeActionNode(nodeId, () => {
      setPriceTargets(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
      setPriceTargetInputs(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
    });
  }, [removeActionNode]);

  // Helper to ensure projected node exists for a specific portfolio
  // Returns the projected node ID
  const ensureProjectedNodeForPortfolio = useCallback((portfolioId, portfolioPosition) => {
    let projectedId = null;

    setProjectedForPortfolio(prev => {
      if (prev[portfolioId]) {
        projectedId = prev[portfolioId];
        return prev;
      }

      // Create new projected node for this portfolio
      const newProjectedId = `projected-${projectedCount + 1}`;
      projectedId = newProjectedId;

      setProjectedCount(c => c + 1);

      setNodes(prevNodes => [
        ...prevNodes,
        {
          id: newProjectedId,
          type: 'projected',
          position: { x: portfolioPosition.x + 800, y: portfolioPosition.y },
          data: { sourcePortfolioId: portfolioId },
        },
      ]);

      return { ...prev, [portfolioId]: newProjectedId };
    });

    return projectedId;
  }, [projectedCount, setNodes]);

  const handleAddRotation = useCallback((sourcePortfolioId) => {
    const newRotationId = `rotate-${rotationCount + 1}`;
    setRotationCount(prev => prev + 1);

    const sourceNode = nodes.find(n => n.id === sourcePortfolioId);
    const sourcePos = sourceNode?.position || { x: 100, y: 150 };

    // Count existing action nodes for this portfolio to offset position
    const portfolioActionNodes = edges
      .filter(e => e.source === sourcePortfolioId)
      .filter(e => e.target.startsWith('rotate-') || e.target.startsWith('sell-') || e.target.startsWith('buy-') || e.target.startsWith('priceTarget-'));
    const yOffset = portfolioActionNodes.length * 180;

    setNodes(prev => {
      let newNodes = [...prev];
      newNodes.push({
        id: newRotationId,
        type: 'rotate',
        position: { x: sourcePos.x + 400, y: sourcePos.y + yOffset },
        data: { sourcePortfolioId },
      });
      return newNodes;
    });

    // Get or create projected node for this portfolio
    const projectedId = projectedForPortfolio[sourcePortfolioId] || `projected-${projectedCount + 1}`;
    ensureProjectedNodeForPortfolio(sourcePortfolioId, sourcePos);

    setEdges(prev => {
      const newEdges = [...prev];
      newEdges.push({
        id: `edge-${sourcePortfolioId}-${newRotationId}`,
        source: sourcePortfolioId,
        target: newRotationId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6' },
      });
      newEdges.push({
        id: `edge-${newRotationId}-${projectedId}`,
        source: newRotationId,
        target: projectedId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#f97316' },
      });
      return newEdges;
    });
  }, [nodes, edges, rotationCount, projectedCount, projectedForPortfolio, setNodes, setEdges, ensureProjectedNodeForPortfolio]);

  const handleAddSell = useCallback((sourcePortfolioId) => {
    const newSellId = `sell-${sellCount + 1}`;
    setSellCount(prev => prev + 1);

    const sourceNode = nodes.find(n => n.id === sourcePortfolioId);
    const sourcePos = sourceNode?.position || { x: 100, y: 150 };

    const portfolioActionNodes = edges
      .filter(e => e.source === sourcePortfolioId)
      .filter(e => e.target.startsWith('rotate-') || e.target.startsWith('sell-') || e.target.startsWith('buy-') || e.target.startsWith('priceTarget-'));
    const yOffset = portfolioActionNodes.length * 180;

    setNodes(prev => {
      let newNodes = [...prev];
      newNodes.push({
        id: newSellId,
        type: 'sell',
        position: { x: sourcePos.x + 400, y: sourcePos.y + yOffset },
        data: { sourcePortfolioId },
      });
      return newNodes;
    });

    const projectedId = projectedForPortfolio[sourcePortfolioId] || `projected-${projectedCount + 1}`;
    ensureProjectedNodeForPortfolio(sourcePortfolioId, sourcePos);

    setEdges(prev => {
      const newEdges = [...prev];
      newEdges.push({
        id: `edge-${sourcePortfolioId}-${newSellId}`,
        source: sourcePortfolioId,
        target: newSellId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6' },
      });
      newEdges.push({
        id: `edge-${newSellId}-${projectedId}`,
        source: newSellId,
        target: projectedId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#ef4444' },
      });
      return newEdges;
    });
  }, [nodes, edges, sellCount, projectedCount, projectedForPortfolio, setNodes, setEdges, ensureProjectedNodeForPortfolio]);

  const handleAddBuy = useCallback((sourcePortfolioId) => {
    const newBuyId = `buy-${buyCount + 1}`;
    setBuyCount(prev => prev + 1);

    const sourceNode = nodes.find(n => n.id === sourcePortfolioId);
    const sourcePos = sourceNode?.position || { x: 100, y: 150 };

    const portfolioActionNodes = edges
      .filter(e => e.source === sourcePortfolioId)
      .filter(e => e.target.startsWith('rotate-') || e.target.startsWith('sell-') || e.target.startsWith('buy-') || e.target.startsWith('priceTarget-'));
    const yOffset = portfolioActionNodes.length * 180;

    setNodes(prev => {
      let newNodes = [...prev];
      newNodes.push({
        id: newBuyId,
        type: 'buy',
        position: { x: sourcePos.x + 400, y: sourcePos.y + yOffset },
        data: { sourcePortfolioId },
      });
      return newNodes;
    });

    const projectedId = projectedForPortfolio[sourcePortfolioId] || `projected-${projectedCount + 1}`;
    ensureProjectedNodeForPortfolio(sourcePortfolioId, sourcePos);

    setEdges(prev => {
      const newEdges = [...prev];
      newEdges.push({
        id: `edge-${sourcePortfolioId}-${newBuyId}`,
        source: sourcePortfolioId,
        target: newBuyId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6' },
      });
      newEdges.push({
        id: `edge-${newBuyId}-${projectedId}`,
        source: newBuyId,
        target: projectedId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#22c55e' },
      });
      return newEdges;
    });
  }, [nodes, edges, buyCount, projectedCount, projectedForPortfolio, setNodes, setEdges, ensureProjectedNodeForPortfolio]);

  const handleAddPriceTarget = useCallback((sourcePortfolioId) => {
    const newPriceTargetId = `priceTarget-${priceTargetCount + 1}`;
    setPriceTargetCount(prev => prev + 1);

    const sourceNode = nodes.find(n => n.id === sourcePortfolioId);
    const sourcePos = sourceNode?.position || { x: 100, y: 150 };

    const portfolioActionNodes = edges
      .filter(e => e.source === sourcePortfolioId)
      .filter(e => e.target.startsWith('rotate-') || e.target.startsWith('sell-') || e.target.startsWith('buy-') || e.target.startsWith('priceTarget-'));
    const yOffset = portfolioActionNodes.length * 180;

    setNodes(prev => {
      let newNodes = [...prev];
      newNodes.push({
        id: newPriceTargetId,
        type: 'priceTarget',
        position: { x: sourcePos.x + 400, y: sourcePos.y + yOffset },
        data: { sourcePortfolioId },
      });
      return newNodes;
    });

    const projectedId = projectedForPortfolio[sourcePortfolioId] || `projected-${projectedCount + 1}`;
    ensureProjectedNodeForPortfolio(sourcePortfolioId, sourcePos);

    setEdges(prev => {
      const newEdges = [...prev];
      newEdges.push({
        id: `edge-${sourcePortfolioId}-${newPriceTargetId}`,
        source: sourcePortfolioId,
        target: newPriceTargetId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6' },
      });
      newEdges.push({
        id: `edge-${newPriceTargetId}-${projectedId}`,
        source: newPriceTargetId,
        target: projectedId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#06b6d4' },
      });
      return newEdges;
    });
  }, [nodes, edges, priceTargetCount, projectedCount, projectedForPortfolio, setNodes, setEdges, ensureProjectedNodeForPortfolio]);

  // Calculate projected holdings for a specific portfolio
  const calculateProjectedHoldings = useCallback((portfolioId) => {
    const holdings = portfolioHoldings[portfolioId] || [];

    // Find action nodes connected to this portfolio
    const connectedActionIds = edges
      .filter(e => e.source === portfolioId)
      .map(e => e.target)
      .filter(id =>
        id.startsWith('rotate-') ||
        id.startsWith('sell-') ||
        id.startsWith('buy-') ||
        id.startsWith('priceTarget-')
      );

    // Build a map of price overrides from price targets connected to this portfolio
    const priceOverrides = {};
    connectedActionIds.forEach(actionId => {
      if (actionId.startsWith('priceTarget-')) {
        const pt = priceTargets[actionId];
        if (pt && pt.asset && pt.targetPrice) {
          priceOverrides[pt.asset] = pt.targetPrice;
        }
      }
    });

    // Clone holdings and apply price overrides
    const projected = holdings.map(h => {
      const overridePrice = priceOverrides[h.ticker];
      if (overridePrice !== undefined) {
        return {
          ...h,
          price: overridePrice,
          value: overridePrice * h.amount,
        };
      }
      return { ...h };
    });

    let totalCash = 0;

    // Apply rotations connected to this portfolio
    connectedActionIds.forEach(actionId => {
      if (actionId.startsWith('rotate-')) {
        const rotation = rotations[actionId];
        if (!rotation) return;

        const { fromAsset, sellAmount, toAsset, toPrice, toType, buyAmount } = rotation;

        const fromIndex = projected.findIndex(h => h.ticker === fromAsset);
        if (fromIndex !== -1) {
          projected[fromIndex].amount -= sellAmount;
          projected[fromIndex].value = projected[fromIndex].amount * (projected[fromIndex].price || 0);
          if (projected[fromIndex].amount <= 0.000001) {
            projected.splice(fromIndex, 1);
          }
        }

        const toIndex = projected.findIndex(h => h.ticker === toAsset);
        if (toIndex !== -1) {
          projected[toIndex].amount += buyAmount;
          projected[toIndex].value = projected[toIndex].amount * (projected[toIndex].price || 0);
        } else {
          projected.push({
            ticker: toAsset,
            amount: buyAmount,
            price: toPrice,
            type: toType,
            value: buyAmount * toPrice,
          });
        }
      }
    });

    // Apply sells connected to this portfolio
    connectedActionIds.forEach(actionId => {
      if (actionId.startsWith('sell-')) {
        const sell = sells[actionId];
        if (!sell) return;

        const { fromAsset, sellAmount, sellValue } = sell;

        const fromIndex = projected.findIndex(h => h.ticker === fromAsset);
        if (fromIndex !== -1) {
          projected[fromIndex].amount -= sellAmount;
          projected[fromIndex].value = projected[fromIndex].amount * (projected[fromIndex].price || 0);
          if (projected[fromIndex].amount <= 0.000001) {
            projected.splice(fromIndex, 1);
          }
        }

        totalCash += sellValue;
      }
    });

    // Apply buys connected to this portfolio
    connectedActionIds.forEach(actionId => {
      if (actionId.startsWith('buy-')) {
        const buy = buys[actionId];
        if (!buy) return;

        const { cashAmount, toAsset, toPrice, toType, buyAmount } = buy;

        totalCash -= cashAmount;

        const toIndex = projected.findIndex(h => h.ticker === toAsset);
        if (toIndex !== -1) {
          projected[toIndex].amount += buyAmount;
          projected[toIndex].value = projected[toIndex].amount * (projected[toIndex].price || 0);
        } else {
          projected.push({
            ticker: toAsset,
            amount: buyAmount,
            price: toPrice,
            type: toType,
            value: buyAmount * toPrice,
          });
        }
      }
    });

    // Add/update cash position if any
    if (totalCash !== 0) {
      const cashIndex = projected.findIndex(h => h.ticker === 'USD');
      if (cashIndex !== -1) {
        projected[cashIndex].amount += totalCash;
        projected[cashIndex].value = projected[cashIndex].amount;
        if (projected[cashIndex].amount <= 0.000001) {
          projected.splice(cashIndex, 1);
        }
      } else if (totalCash > 0) {
        projected.push({
          ticker: 'USD',
          amount: totalCash,
          price: 1,
          type: 'cash',
          value: totalCash,
        });
      }
    }

    return projected.sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [portfolioHoldings, edges, rotations, sells, buys, priceTargets]);

  // Helper to get source portfolio ID for an action node
  const getSourcePortfolioForAction = useCallback((actionNodeId) => {
    const edge = edges.find(e => e.target === actionNodeId && e.source.startsWith('portfolio-'));
    return edge?.source || null;
  }, [edges]);

  // Inject data and callbacks into nodes
  const nodesWithData = useMemo(() => {
    return nodes.map(node => {
      if (node.type === 'portfolio') {
        // Count portfolio nodes - only allow removing if there's more than one
        const portfolioNodeCount = nodes.filter(n => n.type === 'portfolio').length;
        return {
          ...node,
          data: {
            ...node.data,
            holdings: portfolioHoldings[node.id] || [],
            onHoldingsChange: handleHoldingsChange,
            onAddRotation: handleAddRotation,
            onAddSell: handleAddSell,
            onAddBuy: handleAddBuy,
            onAddPriceTarget: handleAddPriceTarget,
            onDuplicate: handleDuplicatePortfolio,
            onRemove: handleRemovePortfolio,
            canRemove: portfolioNodeCount > 1,
          },
        };
      }
      if (node.type === 'rotate') {
        const sourcePortfolioId = getSourcePortfolioForAction(node.id);
        const holdings = sourcePortfolioId ? (portfolioHoldings[sourcePortfolioId] || []) : [];
        return {
          ...node,
          data: {
            ...node.data,
            holdings,
            savedInputs: rotationInputs[node.id],
            onRotationChange: handleRotationChange,
            onInputChange: handleRotationInputChange,
            onRemove: handleRemoveRotation,
          },
        };
      }
      if (node.type === 'sell') {
        const sourcePortfolioId = getSourcePortfolioForAction(node.id);
        const holdings = sourcePortfolioId ? (portfolioHoldings[sourcePortfolioId] || []) : [];
        return {
          ...node,
          data: {
            ...node.data,
            holdings,
            savedInputs: sellInputs[node.id],
            onSellChange: handleSellChange,
            onInputChange: handleSellInputChange,
            onRemove: handleRemoveSell,
          },
        };
      }
      if (node.type === 'buy') {
        return {
          ...node,
          data: {
            ...node.data,
            savedInputs: buyInputs[node.id],
            onBuyChange: handleBuyChange,
            onInputChange: handleBuyInputChange,
            onRemove: handleRemoveBuy,
          },
        };
      }
      if (node.type === 'priceTarget') {
        const sourcePortfolioId = getSourcePortfolioForAction(node.id);
        const holdings = sourcePortfolioId ? (portfolioHoldings[sourcePortfolioId] || []) : [];
        return {
          ...node,
          data: {
            ...node.data,
            holdings,
            savedInputs: priceTargetInputs[node.id],
            onPriceTargetChange: handlePriceTargetChange,
            onInputChange: handlePriceTargetInputChange,
            onRemove: handleRemovePriceTarget,
          },
        };
      }
      if (node.type === 'projected') {
        // Find which portfolio this projected node belongs to
        const sourcePortfolioId = Object.entries(projectedForPortfolio).find(
          ([_, projId]) => projId === node.id
        )?.[0];
        const originalHoldings = sourcePortfolioId ? (portfolioHoldings[sourcePortfolioId] || []) : [];
        const projectedHoldings = sourcePortfolioId ? calculateProjectedHoldings(sourcePortfolioId) : [];
        return {
          ...node,
          data: {
            ...node.data,
            projectedHoldings,
            originalHoldings,
          },
        };
      }
      return node;
    });
  }, [nodes, edges, portfolioHoldings, projectedForPortfolio, rotationInputs, sellInputs, buyInputs, priceTargetInputs, calculateProjectedHoldings, getSourcePortfolioForAction, handleHoldingsChange, handleAddRotation, handleAddSell, handleAddBuy, handleAddPriceTarget, handleDuplicatePortfolio, handleRemovePortfolio, handleRotationChange, handleRotationInputChange, handleRemoveRotation, handleSellChange, handleSellInputChange, handleRemoveSell, handleBuyChange, handleBuyInputChange, handleRemoveBuy, handlePriceTargetChange, handlePriceTargetInputChange, handleRemovePriceTarget]);

  if (!isHydrated) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen">
      <ReactFlow
        nodes={nodesWithData}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#2d2d2d" gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
