import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from "@mui/material";

interface NotesConfirmDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export default function NotesConfirmDialog({ open, onSave, onDiscard }: NotesConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onDiscard} maxWidth="sm" fullWidth>
      <DialogTitle>Save Analysis Notes?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          You have unsaved position notes in Advanced Analysis mode. Would you like to save them to the PGN as annotations before exiting?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDiscard} color="inherit">
          Discard
        </Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Save to PGN
        </Button>
      </DialogActions>
    </Dialog>
  );
}
