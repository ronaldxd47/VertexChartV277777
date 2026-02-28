export interface TradingSignal {
  pair: string;
  action: 'BUY' | 'SELL' | 'NEUTRAL';
  entry: string;
  tp: string;
  sl: string;
  confidence: number;
  reasoning: string;
}

export interface AnalysisResult {
  signal: TradingSignal;
  technical: {
    snr: string;
    ict: string;
    std: string;
    alchemist: string;
  };
  fundamental: string;
  timestamp: string;
}
