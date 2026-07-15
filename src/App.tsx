import { useState } from 'react';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import Select from '@atlaskit/select';
import Popup from '@atlaskit/popup';
import ModalDialog, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';

const OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

export const App = () => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720 }}>
      <h1>Repro: @atlaskit/top-layer@1.6.1 empty animations barrel</h1>
      <p>
        Open your browser console. The page should crash at load with
        <code> TypeError: (0 , sv.slideAndFade) is not a function </code>
        because <code>@atlaskit/tooltip</code>, <code>@atlaskit/select</code>,
        <code>@atlaskit/popup</code>, and <code>@atlaskit/modal-dialog</code>
        all import animation presets from <code>@atlaskit/top-layer/animations</code>,
        which is an empty barrel in 1.6.1.
      </p>

      <section style={{ marginTop: 24, display: 'grid', gap: 16 }}>
        <Tooltip content="This tooltip uses slideAndFade from top-layer/animations">
          {(tooltipProps) => <Button {...tooltipProps}>Hover for tooltip</Button>}
        </Tooltip>

        <div>
          <label htmlFor="select">Select (uses slideAndFade in PopupSelect):</label>
          <Select inputId="select" options={OPTIONS} placeholder="Pick a fruit" />
        </div>

        <Popup
          isOpen={popupOpen}
          onClose={() => setPopupOpen(false)}
          content={() => <div style={{ padding: 12 }}>Popup content (uses popupMotion)</div>}
          trigger={(triggerProps) => (
            <Button {...triggerProps} onClick={() => setPopupOpen((v) => !v)}>
              Toggle popup
            </Button>
          )}
        />

        <Button onClick={() => setModalOpen(true)}>Open modal (uses dialogMotion)</Button>
      </section>

      <ModalTransition>
        {modalOpen && (
          <ModalDialog onClose={() => setModalOpen(false)}>
            <ModalHeader>
              <ModalTitle>Modal dialog</ModalTitle>
            </ModalHeader>
            <ModalBody>
              This dialog is animated with <code>dialogMotion</code> from
              <code> @atlaskit/top-layer/animations</code>.
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => setModalOpen(false)}>Close</Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>
    </main>
  );
};
