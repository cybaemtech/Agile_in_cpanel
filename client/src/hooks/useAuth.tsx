import { useQuery } from "@tanstack/react-query";
import { User } from "../../../shared/schema";
import { apiGet } from "@/lib/api-config";

export function useAuth() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
  };
}
