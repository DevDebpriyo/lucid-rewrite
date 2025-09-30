import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  readOnly?: boolean;
}

export const TextEditor = ({
  value,
  onChange,
  placeholder = "Paste your text here...",
  title = "Input Text",
  readOnly = false,
}: TextEditorProps) => {
  const charCount = value.length;
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Card className="h-full flex flex-col shadow-medium">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-h-[400px] resize-none focus-visible:ring-primary"
          readOnly={readOnly}
        />
      </CardContent>
    </Card>
  );
};
