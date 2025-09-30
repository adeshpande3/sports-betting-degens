interface UserStatsProps {
  userId: string;
}

interface UserData {
  id: string;
  displayName: string;
  balance: number;
  record: {
    wins: number;
    losses: number;
    pushes: number;
  };
  totalWagered: number;
  totalWinnings: number;
  favoriteTeam: string;
  winRate: number;
  averageBet: number;
  biggestWin: number;
  biggestLoss: number;
  recentForm: ("W" | "L" | "P")[];
}

// Mock user data - in a real app this would come from an API
const mockUserData: Record<string, UserData> = {
  "user-1": {
    id: "user-1",
    displayName: "John Doe",
    balance: 1250.75,
    record: {
      wins: 23,
      losses: 17,
      pushes: 3,
    },
    totalWagered: 5800.0,
    totalWinnings: 6050.75,
    favoriteTeam: "Lakers",
    winRate: 53.5,
    averageBet: 134.88,
    biggestWin: 450.0,
    biggestLoss: 200.0,
    recentForm: ["W", "W", "L", "W", "P", "L", "W", "W"],
  },
};

export default function UserStats({ userId }: UserStatsProps) {
  const userData = mockUserData[userId] || mockUserData["user-1"];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getFormColor = (result: "W" | "L" | "P"): string => {
    switch (result) {
      case "W":
        return "bg-green-500";
      case "L":
        return "bg-red-500";
      case "P":
        return "bg-gray-500";
    }
  };

  const totalBets =
    userData.record.wins + userData.record.losses + userData.record.pushes;
  const profitLoss =
    userData.balance + userData.totalWinnings - userData.totalWagered;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sticky top-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {userData.displayName}
        </h2>
        <div className="text-3xl font-bold text-green-600 mb-1">
          {formatCurrency(userData.balance)}
        </div>
        <div className="text-sm text-gray-500">Available Balance</div>
      </div>

      {/* Record */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Betting Record</h3>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-green-50 p-2 rounded">
            <div className="text-lg font-bold text-green-700">
              {userData.record.wins}
            </div>
            <div className="text-xs text-green-600">Wins</div>
          </div>
          <div className="bg-red-50 p-2 rounded">
            <div className="text-lg font-bold text-red-700">
              {userData.record.losses}
            </div>
            <div className="text-xs text-red-600">Losses</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-lg font-bold text-gray-700">
              {userData.record.pushes}
            </div>
            <div className="text-xs text-gray-600">Pushes</div>
          </div>
        </div>
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Win Rate: <span className="font-semibold">{userData.winRate}%</span>
          </span>
        </div>
      </div>

      {/* Recent Form */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Recent Form</h3>
        <div className="flex space-x-1">
          {userData.recentForm.map((result, index) => (
            <div
              key={index}
              className={`w-6 h-6 rounded-full ${getFormColor(
                result
              )} flex items-center justify-center text-white text-xs font-bold`}
            >
              {result}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 mb-3">Statistics</h3>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Wagered:</span>
          <span className="text-sm font-medium">
            {formatCurrency(userData.totalWagered)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Winnings:</span>
          <span className="text-sm font-medium">
            {formatCurrency(userData.totalWinnings)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Profit/Loss:</span>
          <span
            className={`text-sm font-medium ${
              profitLoss >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {profitLoss >= 0 ? "+" : ""}
            {formatCurrency(profitLoss)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Average Bet:</span>
          <span className="text-sm font-medium">
            {formatCurrency(userData.averageBet)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Biggest Win:</span>
          <span className="text-sm font-medium text-green-600">
            +{formatCurrency(userData.biggestWin)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Biggest Loss:</span>
          <span className="text-sm font-medium text-red-600">
            -{formatCurrency(userData.biggestLoss)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Favorite Team:</span>
          <span className="text-sm font-medium">{userData.favoriteTeam}</span>
        </div>
      </div>
    </div>
  );
}
