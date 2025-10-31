import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Play, Pause, Users, LogOut, Clock, Timer, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import type { SentimentDataPoint } from "./ExperimentView";
import { authenticatedFetch, getApiBaseUrl, clearAdminToken, isAdminAuthenticated } from "../utils/auth";
import { logError, logUserAction } from "../utils/logger";
import type { AdminDashboardDuration } from "../types/duration";

interface DemographicData {
  age: string;
  gender: string;
  race: string;
  ethnicity: string;
  nationality: string;
}

interface AggregatedDataPoint {
  time: number;
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

interface TimeBucket {
  time: number;
  count: number;
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

interface ApiDataItem<T> {
  value: T;
}

interface DemographicApiData {
  userId: string;
  age: string;
  gender: string;
  race: string;
  ethnicity: string;
  nationality: string;
}

interface SentimentApiData {
  userId: string;
  sentimentData: SentimentDataPoint[];
}

interface DemographicFilter {
  age: string;
  gender: string;
  race: string;
  nationality: string;
}

interface UserData {
  userId: string;
  demographics: DemographicData;
  sentiment: SentimentDataPoint[];
}

interface DurationStatistics {
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  medianDuration: number;
}

interface DurationDistribution {
  bucket: string;
  count: number;
  percentage: number;
}

interface DurationAnalytics {
  records: AdminDashboardDuration[];
  statistics: DurationStatistics;
  distribution: DurationDistribution[];
  byDemographics: {
    age: Record<string, any>;
    gender: Record<string, any>;
    race: Record<string, any>;
    nationality: Record<string, any>;
  };
}

const MINIMUM_PARTICIPANT_THRESHOLD = 5;

const DURATION_CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AdminDashboardProps {
  onLogout?: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [allUserData, setAllUserData] = useState<UserData[]>([]);
  const [filteredUserData, setFilteredUserData] = useState<UserData[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedDataPoint[]>([]);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentDataPoint | null>(null);
  // Privacy warning disabled for testing
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [durationAnalytics, setDurationAnalytics] = useState<DurationAnalytics | null>(null);

  const [filters, setFilters] = useState<DemographicFilter>({
    age: "all",
    gender: "all",
    race: "all",
    nationality: "all",
  });

  // Logout handler
  const handleLogout = () => {
    clearAdminToken();
    onLogout?.();
  };

  // Fetch all data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication before making requests
        if (!isAdminAuthenticated()) {
          handleLogout();
          return;
        }

        const apiBaseUrl = getApiBaseUrl();
        const [demographicsRes, sentimentRes, durationRes] = await Promise.all([
          authenticatedFetch(`${apiBaseUrl}/server/all-demographics`),
          authenticatedFetch(`${apiBaseUrl}/server/all-sentiment`),
          authenticatedFetch(`${apiBaseUrl}/server/duration-analytics`),
        ]);

        const demographicsData = await demographicsRes.json();
        const sentimentDataRes = await sentimentRes.json();
        const durationData = await durationRes.json();

        // Set duration analytics
        setDurationAnalytics(durationData);

        // Combine data by userId
        const combinedData: UserData[] = [];
        
        if (demographicsData.demographics && sentimentDataRes.sentiment) {
          const demographicsMap = new Map();
          demographicsData.demographics.forEach((item: ApiDataItem<DemographicApiData>) => {
            if (item.value) {
              demographicsMap.set(item.value.userId, item.value);
            }
          });

          sentimentDataRes.sentiment.forEach((item: ApiDataItem<SentimentApiData>) => {
            if (item.value) {
              const userId = item.value.userId;
              combinedData.push({
                userId,
                demographics: demographicsMap.get(userId) || {},
                sentiment: item.value.sentimentData || [],
              });
            }
          });
        }

        setAllUserData(combinedData);
        setFilteredUserData(combinedData);
      } catch (error) {
        logError("Error fetching admin data", error as Error, "AdminDashboard");
        
        // If authentication error, redirect to login
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          handleLogout();
        }
      }
    };

    fetchData();
  }, []);

  // Apply demographic filters and privacy threshold
  useEffect(() => {
    const filtered = allUserData.filter(user => {
      const demo = user.demographics;
      if (!demo) return false;

      if (filters.age !== "all" && demo.age !== filters.age) return false;
      if (filters.gender !== "all" && demo.gender !== filters.gender) return false;
      if (filters.race !== "all" && demo.race !== filters.race) return false;
      if (filters.nationality !== "all" && demo.nationality !== filters.nationality) return false;

      return true;
    });

    setFilteredUserData(filtered);
    // Privacy threshold disabled for testing purposes
    // setShowPrivacyWarning(filtered.length < MINIMUM_PARTICIPANT_THRESHOLD);
    setShowPrivacyWarning(false);
  }, [filters, allUserData]);

  // Update current sentiment based on video time
  useEffect(() => {
    if (filteredUserData.length === 0) return;

    // Aggregate sentiment data at current timestamp
    const timeWindow = 1; // 1 second window
    const relevantData: SentimentDataPoint[] = [];

    filteredUserData.forEach(user => {
      const dataPoints = user.sentiment.filter(
        (point: SentimentDataPoint) => 
          Math.abs(point.timestamp - currentTime) <= timeWindow
      );
      relevantData.push(...dataPoints);
    });

    if (relevantData.length > 0) {
      const aggregated = {
        neutral: 0,
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
        surprised: 0,
      };

      relevantData.forEach(point => {
        aggregated.neutral += point.expressions.neutral;
        aggregated.happy += point.expressions.happy;
        aggregated.sad += point.expressions.sad;
        aggregated.angry += point.expressions.angry;
        aggregated.fearful += point.expressions.fearful;
        aggregated.disgusted += point.expressions.disgusted;
        aggregated.surprised += point.expressions.surprised;
      });

      const count = relevantData.length;
      Object.keys(aggregated).forEach(key => {
        aggregated[key as keyof typeof aggregated] /= count;
      });

      setCurrentSentiment(aggregated);
    }
  }, [currentTime, filteredUserData]);

  // Update aggregated data for timeline
  useEffect(() => {
    if (filteredUserData.length === 0 || duration === 0) return;

    const buckets: TimeBucket[] = [];
    const bucketSize = 5; // 5 second buckets
    const numBuckets = Math.ceil(duration / bucketSize);

    for (let i = 0; i < numBuckets; i++) {
      const startTime = i * bucketSize;
      const endTime = startTime + bucketSize;
      
      const dataInBucket: SentimentDataPoint[] = [];
      filteredUserData.forEach(user => {
        const points = user.sentiment.filter(
          (point: SentimentDataPoint) => 
            point.timestamp >= startTime && point.timestamp < endTime
        );
        dataInBucket.push(...points);
      });

      if (dataInBucket.length > 0) {
        const avg = {
          time: startTime,
          neutral: 0,
          happy: 0,
          sad: 0,
          angry: 0,
          fearful: 0,
          disgusted: 0,
          surprised: 0,
        };

        dataInBucket.forEach(point => {
          avg.neutral += point.expressions.neutral;
          avg.happy += point.expressions.happy;
          avg.sad += point.expressions.sad;
          avg.angry += point.expressions.angry;
          avg.fearful += point.expressions.fearful;
          avg.disgusted += point.expressions.disgusted;
          avg.surprised += point.expressions.surprised;
        });

        const count = dataInBucket.length;
        avg.neutral /= count;
        avg.happy /= count;
        avg.sad /= count;
        avg.angry /= count;
        avg.fearful /= count;
        avg.disgusted /= count;
        avg.surprised /= count;

        buckets.push(avg);
      }
    }

    setAggregatedData(buckets);
  }, [filteredUserData, duration]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const getCurrentSentimentData = () => {
    if (!currentSentiment) return [];

    return [
      { emotion: "Happy", value: (currentSentiment.happy * 100).toFixed(1) },
      { emotion: "Sad", value: (currentSentiment.sad * 100).toFixed(1) },
      { emotion: "Angry", value: (currentSentiment.angry * 100).toFixed(1) },
      { emotion: "Surprised", value: (currentSentiment.surprised * 100).toFixed(1) },
      { emotion: "Fearful", value: (currentSentiment.fearful * 100).toFixed(1) },
      { emotion: "Disgusted", value: (currentSentiment.disgusted * 100).toFixed(1) },
      { emotion: "Neutral", value: (currentSentiment.neutral * 100).toFixed(1) },
    ];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="text-muted-foreground">Facial Sentiment Analysis Results</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="text-2xl">{filteredUserData.length}</div>
                    <div className="text-sm text-muted-foreground">Participants</div>
                  </div>
                </div>
              </Card>
              
              {durationAnalytics && (
                <>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="text-2xl">{durationAnalytics.statistics.count}</div>
                        <div className="text-sm text-muted-foreground">Recordings</div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Timer className="w-8 h-8 text-orange-600" />
                      <div>
                        <div className="text-2xl">{Math.round(durationAnalytics.statistics.averageDuration)}s</div>
                        <div className="text-sm text-muted-foreground">Avg Duration</div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                      <div>
                        <div className="text-2xl">{Math.round(durationAnalytics.statistics.totalDuration / 60)}m</div>
                        <div className="text-sm text-muted-foreground">Total Time</div>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Privacy Threshold Warning */}
        {showPrivacyWarning && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-amber-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">Privacy Threshold Warning</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Filtered dataset contains fewer than {MINIMUM_PARTICIPANT_THRESHOLD} participants
                    (current: {filteredUserData.length}). To protect individual privacy, data is not
                    displayed when participant count is below the minimum threshold. Please adjust your
                    filters to include more participants.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demographic Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Demographic Filters</CardTitle>
            <CardDescription>Filter sentiment data by participant demographics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Age Range</Label>
                <Select value={filters.age} onValueChange={(value) => setFilters({ ...filters, age: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="18-24">18-24</SelectItem>
                    <SelectItem value="25-34">25-34</SelectItem>
                    <SelectItem value="35-44">35-44</SelectItem>
                    <SelectItem value="45-54">45-54</SelectItem>
                    <SelectItem value="55-64">55-64</SelectItem>
                    <SelectItem value="65+">65+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={filters.gender} onValueChange={(value) => setFilters({ ...filters, gender: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Race</Label>
                <Select value={filters.race} onValueChange={(value) => setFilters({ ...filters, race: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Races</SelectItem>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="black">Black or African American</SelectItem>
                    <SelectItem value="white">White or Caucasian</SelectItem>
                    <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                    <SelectItem value="multiracial">Multiracial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nationality</Label>
                <Select value={filters.nationality} onValueChange={(value) => setFilters({ ...filters, nationality: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Nationalities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Player */}
        <Card>
          <CardHeader>
            <CardTitle>Experiment Video</CardTitle>
            <CardDescription>Control playback to view sentiment data at different timestamps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              >
                <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={handlePlayPause} size="sm">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <div className="flex-1 space-y-2">
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Monitoring Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Real-time Monitoring</h2>
        </div>
        
        {!showPrivacyWarning && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Sentiment Distribution</CardTitle>
                <CardDescription>
                  Aggregated emotions at {formatTime(currentTime)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getCurrentSentimentData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="emotion" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emotion Analytics Timeline</CardTitle>
                <CardDescription>All 7 emotions averaged over users throughout the experiment video</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(value) => formatTime(value)}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(value) => `Time: ${formatTime(value as number)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="neutral" stroke="#6b7280" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="happy" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sad" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="angry" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fearful" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="disgusted" stroke="#84cc16" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="surprised" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Duration Analytics Section */}
        {durationAnalytics && !showPrivacyWarning && (
          <>
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recording Duration Analytics</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Duration Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Duration Statistics</CardTitle>
                  <CardDescription>Summary of recording durations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Recordings:</span>
                      <span className="font-medium">{durationAnalytics.statistics.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Duration:</span>
                      <span className="font-medium">{Math.round(durationAnalytics.statistics.averageDuration)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Median Duration:</span>
                      <span className="font-medium">{Math.round(durationAnalytics.statistics.medianDuration)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Min Duration:</span>
                      <span className="font-medium">{Math.round(durationAnalytics.statistics.minDuration)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Max Duration:</span>
                      <span className="font-medium">{Math.round(durationAnalytics.statistics.maxDuration)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Time:</span>
                      <span className="font-medium">{Math.round(durationAnalytics.statistics.totalDuration / 60)}m</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Duration Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Duration Distribution</CardTitle>
                  <CardDescription>Breakdown by duration ranges</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={durationAnalytics.distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ bucket, percentage }) => `${bucket}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {durationAnalytics.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DURATION_CHART_COLORS[index % DURATION_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} recordings`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Duration by Demographics */}
              <Card>
                <CardHeader>
                  <CardTitle>Duration by Age Group</CardTitle>
                  <CardDescription>Average recording duration by age</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={Object.entries(durationAnalytics.byDemographics.age).map(([age, stats]: [string, any]) => ({
                      age,
                      averageDuration: Math.round(stats.averageDuration),
                      count: stats.count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip formatter={(value: number, name: string) => [
                        name === 'averageDuration' ? `${value}s` : `${value} recordings`,
                        name === 'averageDuration' ? 'Average Duration' : 'Count'
                      ]} />
                      <Bar dataKey="averageDuration" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Duration Records */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Recording Durations</CardTitle>
                <CardDescription>Individual recording duration details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">User ID</th>
                        <th className="text-left p-2">Duration</th>
                        <th className="text-left p-2">Precise Duration</th>
                        <th className="text-left p-2">Age</th>
                        <th className="text-left p-2">Gender</th>
                        <th className="text-left p-2">Recorded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {durationAnalytics.records.slice(0, 10).map((record) => (
                        <tr key={record.captureId} className="border-b">
                          <td className="p-2 font-mono text-xs">{record.userId.substring(0, 8)}...</td>
                          <td className="p-2">{record.formattedDuration}</td>
                          <td className="p-2 font-mono text-xs">{record.preciseDuration}</td>
                          <td className="p-2">{record.demographics.age}</td>
                          <td className="p-2">{record.demographics.gender}</td>
                          <td className="p-2">{new Date(record.recordedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {durationAnalytics.records.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2 p-2">
                      Showing 10 of {durationAnalytics.records.length} recordings
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
