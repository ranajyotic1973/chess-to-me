import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import type { FC } from "react";

interface MoveWarningDialogProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

const MoveWarningDialog: FC<MoveWarningDialogProps> = ({ open, message, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invalid Move</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 2 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveWarningDialog;
