import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateRideRequest } from "@shared/routes";

export function useRides(filters?: { origin?: string; destination?: string; date?: string }) {
  // Construct query string for key consistency
  const queryString = new URLSearchParams(filters as Record<string, string>).toString();
  const queryKey = [api.rides.list.path, queryString];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = filters 
        ? `${api.rides.list.path}?${queryString}`
        : api.rides.list.path;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch rides");
      return api.rides.list.responses[200].parse(await res.json());
    },
  });
}

export function useRide(id: number) {
  return useQuery({
    queryKey: [api.rides.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.rides.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch ride");
      return api.rides.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CreateRideRequest, "driverId">) => {
      const res = await fetch(api.rides.create.path, {
        method: api.rides.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create ride");
      }
      return api.rides.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rides.list.path] });
    },
  });
}

export function useUpdateRideStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "scheduled" | "in_progress" | "completed" | "cancelled" }) => {
      const url = buildUrl(api.rides.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.rides.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return api.rides.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rides.list.path] });
    },
  });
}
