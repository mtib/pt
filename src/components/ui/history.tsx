/**
 * History component for displaying daily learning progress.
 * 
 * Shows a compact progress visualization with:
 * - Practice phrase count (left)
 * - 14-day histogram with styled div bars (center) 
 * - XP total overlay (center)
 * - Daily difference with trend icon (right)
 * 
 * Uses styled div bars instead of Unicode box characters for better
 * cross-browser compatibility and visual consistency.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { useLearningContext } from "@/contexts";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { ListRestart, TrendingDown, TrendingUp, TrendingUpDown } from "lucide-react";

/**
 * Individual histogram bar component.
 * 
 * Renders a single day's practice data as a styled div bar with:
 * - Height based on normalized value (minimum 2% for visibility)
 * - Hover effects and tooltips
 * - Responsive styling for light/dark themes
 * 
 * @param normalized - Value from 0-1 representing relative practice amount
 * @param count - Absolute number of words practiced that day
 */
const HistogramBar = ({ normalized, count }: { normalized: number; count: number }) => {
    const height = Math.max(normalized * 100, 2); // Minimum height of 2% for visibility
    
    return (
        <div className="flex flex-col items-center justify-end h-8 w-2">
            <div 
                className="w-full bg-neutral-600 dark:bg-neutral-400 rounded-[1px] transition-all duration-200 hover:bg-blue-500 dark:hover:bg-blue-400"
                style={{ height: `${height}%` }}
                title={`${count} words practiced`}
            />
        </div>
    );
};

const History = () => {
    const { dailyStats, vocabularyXP, practicePhraseCount } = useLearningContext();
    const { resolvedTheme } = useTheme();
    const diffClass = (() => {
        if (dailyStats.diff > 0) return 'text-green-800 dark:text-green-400';
        if (dailyStats.diff < 0) return 'text-red-800 dark:text-red-400';
        return 'text-neutral-600 dark:text-neutral-400';
    })();
    
    const dropShadowColor = resolvedTheme === 'dark' ? '#000e' : '#fffe';
    const blur = '0px';
    const blurDistance = '1px';
    
    return (
        <div className='flex flex-row justify-center items-center gap-4'>
            <div className="flex flex-row justify-center bg-white dark:bg-black rounded-md border border-neutral-400 dark:border-neutral-600">
                <div className="flex flex-row items-center gap-1 px-3 py-2">
                    <ListRestart size={16} />
                    <span>{practicePhraseCount}</span>
                </div>
                <div className="relative w-[1px] bottom-0 bg-neutral-400 dark:bg-neutral-600"></div>
                <div className="relative flex items-center px-2 py-2">
                    <div className="flex flex-row items-end gap-0.5 h-8">
                        {dailyStats.histogramData.map((day, index) => (
                            <HistogramBar 
                                key={`${day.date}-${index}`}
                                normalized={day.normalized}
                                count={day.count}
                            />
                        ))}
                    </div>
                    <div className="absolute inset-0 flex flex-row justify-center items-center pointer-events-none">
                        <div className='flex flex-row gap-1' style={{
                            filter: `drop-shadow(${blurDistance} ${blurDistance} ${blur} ${dropShadowColor}) drop-shadow(-${blurDistance} -${blurDistance} ${blur} ${dropShadowColor}) drop-shadow(${blurDistance} -${blurDistance} ${blur} ${dropShadowColor}) drop-shadow(-${blurDistance} ${blurDistance} ${blur} ${dropShadowColor})`,
                        }}>
                            <span className='font-bold'>{vocabularyXP}</span>
                            <span>XP</span>
                        </div>
                    </div>
                </div>
                <div className="relative w-[1px] bottom-0 bg-neutral-400 dark:bg-neutral-600"></div>
                <div className={cn(diffClass, 'flex flex-row items-center gap-1 px-3')}>
                    {(() => {
                        if (dailyStats.diff > 0) {
                            return <TrendingUp size={12} />;
                        } else if (dailyStats.diff < 0) {
                            return <TrendingDown size={12} />;
                        } else {
                            return <TrendingUpDown size={12} />;
                        }
                    })()}
                    <span>{Math.abs(dailyStats.diff)}</span>
                </div>
            </div>
        </div>
    );
};

export default History;
