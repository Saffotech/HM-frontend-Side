import { Modal, Button } from '@/shared/components/common';

export default function PharmacyDetailListModal({ isOpen, onClose, title, children }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      {children}
    </Modal>
  );
}
