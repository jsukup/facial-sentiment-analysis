import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface DemographicFormProps {
  open: boolean;
  onComplete: (data: DemographicData) => void;
}

export interface DemographicData {
  age: string;
  gender: string;
  race: string;
  ethnicity: string;
  nationality: string;
}

export function DemographicForm({ open, onComplete }: DemographicFormProps) {
  const [formData, setFormData] = useState<DemographicData>({
    age: "",
    gender: "",
    race: "",
    ethnicity: "",
    nationality: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Demographic Information</DialogTitle>
          <DialogDescription>
            Please provide the following information for research purposes. All data is confidential.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="age">Age Range</Label>
            <Select
              value={formData.age}
              onValueChange={(value) => setFormData({ ...formData, age: value })}
            >
              <SelectTrigger id="age">
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="18-24">18-24</SelectItem>
                <SelectItem value="25-34">25-34</SelectItem>
                <SelectItem value="35-44">35-44</SelectItem>
                <SelectItem value="45-54">45-54</SelectItem>
                <SelectItem value="55-64">55-64</SelectItem>
                <SelectItem value="65+">65+</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="race">Race</Label>
            <Select
              value={formData.race}
              onValueChange={(value) => setFormData({ ...formData, race: value })}
            >
              <SelectTrigger id="race">
                <SelectValue placeholder="Select race" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asian">Asian</SelectItem>
                <SelectItem value="black">Black or African American</SelectItem>
                <SelectItem value="white">White or Caucasian</SelectItem>
                <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                <SelectItem value="native-american">Native American or Alaska Native</SelectItem>
                <SelectItem value="pacific-islander">Native Hawaiian or Pacific Islander</SelectItem>
                <SelectItem value="multiracial">Multiracial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ethnicity">Ethnicity</Label>
            <Input
              id="ethnicity"
              value={formData.ethnicity}
              onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
              placeholder="Enter ethnicity (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              placeholder="Enter nationality"
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full">
              Complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
