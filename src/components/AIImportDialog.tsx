import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from "@mui/material";

interface AIImportDialogProps {
  open: boolean;
  onYes: () => void;
  onNo: () => void;
}

/**
 * Popup A — asks the user whether to seed the note editor with the AI's
 * analysis of the current line before opening the markdown editor (popup B).
 */
export default function AIImportDialog({ open, onYes, onNo }: AIImportDialogProps) {
  return (
    <Dialog open={open} onClose={onNo} maxWidth="xs" fullWidth>
      <DialogTitle>Add a note</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Do you want to copy the AI notes into your notes?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onNo} color="inherit">
          No
        </Button>
        <Button onClick={onYes} variant="contained" color="primary">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
