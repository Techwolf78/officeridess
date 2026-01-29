import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertVehicle } from "@shared/routes";

export function useVehicles() {
  return useQuery({
    queryKey: [api.user.vehicles.list.path],
    queryFn: async () => {
      const res = await fetch(api.user.vehicles.list.path);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return api.user.vehicles.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertVehicle, "userId">) => {
      const res = await fetch(api.user.vehicles.create.path, {
        method: api.user.vehicles.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vehicle");
      return api.user.vehicles.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.user.vehicles.list.path] });
    },
  });
}
