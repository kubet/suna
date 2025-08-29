'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GrainText } from '@/components/ui/grain-text';
import {
  BarChart3,
  Bot,
  Briefcase,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Target,
  Brain,
  Globe,
  Heart,
  PenTool,
  Code,
  Camera,
  Calendar,
  DollarSign,
  Rocket,
  CornerDownLeft,
  CornerDownRight,
} from 'lucide-react';

type PromptExample = {
  title: string;
  query: string;
  icon: React.ReactNode;
};

const allPrompts: PromptExample[] = [
  {
    title: 'Find and map the best local bakeries with ratings and reviews',
    query: '1. Search Google Maps for "best bakeries in {{city}}"\n2. Create a custom list with top {{number}} bakeries\n3. For each bakery, gather:\n   - Customer ratings and popular items\n   - Hours, location, and specialties\n   - Price range and must-try pastries\n4. Generate a summary with recommendations',
    icon: <Globe className="text-blue-700 dark:text-blue-400" size={16} />,
  },
  {
    title: 'Research global education statistics and enrollment data',
    query: '1. Access UNESCO database for {{topic}} education statistics\n2. Compile data on:\n   - Student enrollment ratios by region\n   - Teacher-to-student ratios globally\n   - Education spending as % of GDP\n3. Create structured spreadsheet with trends\n4. Generate executive summary with key insights',
    icon: <BarChart3 className="text-purple-700 dark:text-purple-400" size={16} />,
  },
  {
    title: 'Plan comprehensive travel itinerary with attractions and dining',
    query: '1. Research {{destination}} on TripAdvisor for {{duration}} day trip\n2. Find top attractions, restaurants, and activities\n3. Optimize daily schedule by location and hours\n4. Include transportation, weather, and backup plans\n5. Create day-by-day itinerary with time blocks',
    icon: <Calendar className="text-rose-700 dark:text-rose-400" size={16} />,
  },
  {
    title: 'Analyze media coverage trends and expert commentary patterns',
    query: '1. Search {{news_outlet}} for {{topic}} articles from past {{time_period}}\n2. Categorize coverage and identify key themes\n3. Track expert sources and data points\n4. Create timeline of major developments\n5. Generate report with insights and coverage gaps',
    icon: <PenTool className="text-indigo-700 dark:text-indigo-400" size={16} />,
  },
  // {
  //   title: 'Book restaurant reservations',
  //   query: '1. Search OpenTable for restaurants in {{city}} for {{occasion}}\n2. Filter by date, party size, and cuisine preferences\n3. Check reviews and menu highlights\n4. Make reservations at {{number}} restaurants\n5. Create itinerary with confirmation details',
  //   icon: <Users className="text-emerald-700 dark:text-emerald-400" size={16} />,
  // },
  {
    title: 'Build detailed financial models with forecasts and scenarios',
    query: '1. Create {{model_type}} model for {{company_type}} business\n2. Gather historical data and industry benchmarks\n3. Build revenue forecasts and expense projections\n4. Include DCF, LTV/CAC, or NPV analysis\n5. Design Excel dashboard with scenarios',
    icon: <DollarSign className="text-orange-700 dark:text-orange-400" size={16} />,
  },
  {
    title: 'Develop go-to-market strategy with competitive analysis',
    query: '1. Create go-to-market strategy for {{product_type}} launch\n2. Analyze target market and competitive landscape\n3. Design market entry and pricing strategy\n4. Build financial projections and timeline\n5. Create presentation with recommendations',
    icon: <Target className="text-cyan-700 dark:text-cyan-400" size={16} />,
  },
  {
    title: 'Research company intelligence with leadership and funding data',
    query: '1. Research {{company_name}} comprehensively\n2. Gather recent news, funding, and leadership info\n3. Analyze competitive position and market share\n4. Research key personnel background\n5. Create detailed profile with actionable insights',
    icon: <Briefcase className="text-teal-700 dark:text-teal-400" size={16} />,
  },
  {
    title: 'Audit calendar productivity and meeting effectiveness patterns',
    query: '1. Analyze {{calendar_app}} data from past {{months}} months\n2. Assess meeting frequency and focus time\n3. Identify optimization opportunities\n4. Analyze meeting effectiveness patterns\n5. Generate recommendations and implementation plan',
    icon: <Calendar className="text-violet-700 dark:text-violet-400" size={16} />,
  },
  {
    title: 'Research industry trends with investment and technology insights',
    query: '1. Research {{industry}} trends from {{data_sources}}\n2. Gather investment activity and technology developments\n3. Analyze market drivers and opportunities\n4. Identify emerging themes and gaps\n5. Create comprehensive report with recommendations',
    icon: <TrendingUp className="text-pink-700 dark:text-pink-400" size={16} />,
  },
  {
    title: 'Automate customer support ticket categorization and responses',
    query: '1. Monitor {{support_platform}} for incoming tickets\n2. Categorize issues and assess urgency\n3. Search {{knowledge_base}} for solutions\n4. Auto-respond or escalate based on confidence\n5. Track metrics and generate daily reports',
    icon: <Shield className="text-yellow-600 dark:text-yellow-300" size={16} />,
  },
  {
    title: 'Research legal compliance requirements across jurisdictions',
    query: '1. Research {{legal_topic}} across {{jurisdictions}}\n2. Compare state requirements and fees\n3. Analyze decision factors and implications\n4. Gather practical implementation details\n5. Create comparison spreadsheet with recommendations',
    icon: <Settings className="text-red-700 dark:text-red-400" size={16} />,
  },
  {
    title: 'Compile comprehensive data analysis with visualizations',
    query: '1. Gather {{data_topic}} from {{data_sources}}\n2. Clean and standardize datasets\n3. Analyze patterns and calculate trends\n4. Create spreadsheet with visualizations\n5. Provide strategic recommendations',
    icon: <BarChart3 className="text-slate-700 dark:text-slate-400" size={16} />,
  },
  {
    title: 'Plan social media content calendar with trending topics',
    query: '1. Create {{duration}} social strategy for {{brand}}\n2. Research trending topics and competitor content\n3. Develop content calendar with {{posts_per_week}} posts\n4. Create platform-specific content and scheduling\n5. Set up analytics and monthly reporting',
    icon: <Camera className="text-stone-700 dark:text-stone-400" size={16} />,
  },
  {
    title: 'Compare products with scientific studies and expert reviews',
    query: '1. Research {{product_category}} options comprehensively\n2. Gather scientific studies and expert opinions\n3. Analyze benefits, drawbacks, and costs\n4. Research current expert consensus\n5. Create comparison report with personalized recommendations',
    icon: <Brain className="text-fuchsia-700 dark:text-fuchsia-400" size={16} />,
  },
  {
    title: 'Analyze market opportunities with investment themes and risks',
    query: '1. Research {{market_topic}} for investment opportunities\n2. Analyze market size, growth, and key players\n3. Identify investment themes and risks\n4. Assess market challenges and barriers\n5. Create investment presentation with recommendations',
    icon: <Rocket className="text-green-600 dark:text-green-300" size={16} />,
  },
  {
    title: 'Process invoices and extract financial data automatically',
    query: '1. Scan {{document_folder}} for PDF invoices\n2. Extract key data: numbers, dates, amounts, vendors\n3. Organize data with standardized fields\n4. Build comprehensive tracking spreadsheet\n5. Generate monthly financial reports',
    icon: <Heart className="text-amber-700 dark:text-amber-400" size={16} />,
  },
  {
    title: 'Source qualified talent candidates with skills assessment',
    query: '1. Search for {{job_title}} candidates in {{location}}\n2. Use LinkedIn, GitHub, and job boards\n3. Evaluate skills, experience, and culture fit\n4. Create ranked candidate pipeline\n5. Develop personalized outreach strategy',
    icon: <Users className="text-blue-600 dark:text-blue-300" size={16} />,
  },
  {
    title: 'Build professional website with SEO and portfolio optimization',
    query: '1. Research {{person_name}} online comprehensively\n2. Analyze professional brand and achievements\n3. Design website structure and content\n4. Create optimized pages with portfolio\n5. Implement SEO and performance features',
    icon: <Globe className="text-red-600 dark:text-red-300" size={16} />,
  },
];

// Function to get deterministic prompts (no random for SSR)
const getDefaultPrompts = (count: number = 3): PromptExample[] => {
  return allPrompts.slice(0, count);
};

export const Examples = ({
  onSelectPrompt,
  searchQuery = '',
}: {
  onSelectPrompt?: (query: string) => void;
  searchQuery?: string;
}) => {
  const [randomPrompts, setRandomPrompts] = useState<PromptExample[]>(getDefaultPrompts(3));
  const [isClient, setIsClient] = useState(false);

  // Set random prompts only on client to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    const shuffled = [...allPrompts].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 3));
  }, []);

  // Filter prompts based on search query containing %
  const filteredPrompts = React.useMemo(() => {
    if (!searchQuery.includes('%')) return [];

    const query = searchQuery.toLowerCase();
    return allPrompts
      .filter(prompt =>
        prompt.title.toLowerCase().includes(query.replace(/%/g, '')) ||
        prompt.query.toLowerCase().includes(query.replace(/%/g, ''))
      )
      .slice(0, 3);
  }, [searchQuery]);

  const displayedPrompts = searchQuery.includes('%') ? filteredPrompts : randomPrompts;

  if (displayedPrompts.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-0">
      <div className="flex flex-col gap-2">
        {displayedPrompts.map((prompt, index) => (
          <motion.div
            key={`${prompt.title}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: index * 0.05,
              ease: "easeOut"
            }}
          >
            <Button
              variant="ghost"
              className="w-full h-fit p-0 py-1 justify-start text-left border-0 bg-transparent hover:bg-transparent"
              onClick={() => onSelectPrompt && onSelectPrompt(prompt.query)}
            >
              <div className="flex items-start gap-3 w-full">
                <CornerDownRight size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <GrainText
                    className="text-sm font-medium text-foreground"
                    grainOpacity={10 + (index * 50)}
                  >
                    {prompt.title}
                  </GrainText>
                </div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};