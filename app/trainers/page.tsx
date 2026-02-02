import { TrainerDiscovery } from "@/components/trainer-discovery";

export default function TrainersPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div>
        <h1 className="font-bold text-2xl">Find a Trainer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse personal trainers by specialization, location, experience, and
          price.
        </p>
      </div>
      <TrainerDiscovery />
    </div>
  );
}
