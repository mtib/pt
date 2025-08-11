import { useLearningContext } from "@/contexts";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { ListRestart, TrendingDown, TrendingUp, TrendingUpDown } from "lucide-react";

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
                <pre className="relative flex items-end">
                    <code className="text-3xl">{dailyStats.histogram}</code>
                    <div className="h-full w-full absolute flex flex-row justify-center items-center">
                        <div className='flex flex-row gap-1' style={{
                            filter: `drop-shadow(${blurDistance} ${blurDistance} ${blur} ${dropShadowColor}) drop-shadow(-${blurDistance} -${blurDistance} ${blur} ${dropShadowColor}) drop-shadow(${blurDistance} -${blurDistance} ${blur} ${dropShadowColor}) drop-shadow(-${blurDistance} ${blurDistance} ${blur} ${dropShadowColor})`,
                        }}>
                            <span className='font-bold'>{vocabularyXP}</span>
                            <span>XP</span>
                        </div>
                    </div>
                </pre>
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
