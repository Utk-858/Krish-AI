
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, ReferenceLine, ReferenceDot } from 'recharts';
import { useMemo } from 'react';

interface PriceChartProps {
    cropName: string;
    isHindi: boolean;
}

// More realistic mock prediction data
const mockPredictionData = (cropName: string) => {
    const basePrice = cropName.toLowerCase() === 'tomato' ? 2200 : 1800;
    const today = new Date();
    const data = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i - 7); // Start from 7 days ago

        const dayOfYear = (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24);
        
        // Simulate a seasonal trend with a sine wave
        const seasonalFactor = Math.sin(dayOfYear / 30) * 150; 
        // A slight upward trend
        const trendFactor = i * 2;
        // Random daily fluctuation
        const noise = (Math.random() - 0.5) * 100;
        
        const price = basePrice + seasonalFactor + trendFactor + noise;

        return {
            date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short'}),
            predicted: Math.round(price),
            actual: i < 7 ? Math.round(price - (Math.random() * 50) + 25) : null,
        };
    });
    return data;
};


export function PriceChart({ cropName, isHindi }: PriceChartProps) {
    const data = useMemo(() => mockPredictionData(cropName), [cropName]);
    const averagePrice = useMemo(() => data.reduce((acc, item) => acc + item.predicted, 0) / data.length, [data]);

    const chartConfig = {
        predicted: {
            label: isHindi ? 'अनुमानित मूल्य' : 'Predicted Price',
            color: 'hsl(var(--chart-2))',
        },
        actual: {
            label: isHindi ? 'वास्तविक मूल्य' : 'Actual Price',
            color: 'hsl(var(--chart-1))',
        },
    };

    return (
        <div className="mt-6">
            <h3 className="font-semibold mb-2">{isHindi ? `${cropName} के लिए 30-दिवसीय मूल्य रुझान और भविष्यवाणी` : `30-Day Price Trend & Prediction for ${cropName}`}</h3>
             <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `₹${value}`}
                      domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <ChartTooltip 
                        cursor={false}
                        content={<ChartTooltipContent 
                            indicator="line" 
                            labelFormatter={(label, payload) => {
                                return payload?.[0]?.payload.date;
                            }}
                            formatter={(value, name) => [`₹${value}/${isHindi ? 'क्विंटल' : 'quintal'}`, name]}
                        />} 
                    />
                    <Legend />
                    <ReferenceLine y={averagePrice} label={isHindi ? 'औसत मूल्य' : 'Avg. Price'} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <ReferenceDot x={data[14]?.date} y={data[14]?.predicted + 200} label={isHindi ? 'त्योहार की तेजी' : 'Festival Spike'} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" />
                    <Area
                        dataKey="actual"
                        type="monotone"
                        fill="var(--color-actual)"
                        fillOpacity={0.3}
                        stroke="var(--color-actual)"
                        stackId="a"
                        name={isHindi ? 'वास्तविक' : 'Actual'}
                    />
                    <Area
                        dataKey="predicted"
                        type="monotone"
                        fill="var(--color-predicted)"
                        fillOpacity={0.4}
                        stroke="var(--color-predicted)"
                        stackId="a"
                        name={isHindi ? 'अनुमानित' : 'Predicted'}
                    />
                </AreaChart>
            </ChartContainer>
             <p className="text-center text-sm text-muted-foreground mt-2">
                {isHindi ? 'मौसमी और बाजार के रुझानों के आधार पर अगले 23 दिनों की भविष्यवाणी।' : 'Prediction for the next 23 days based on seasonal and market trends.'}
             </p>
        </div>
    );
}
