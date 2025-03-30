import React from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const Tour = ({ setShowWelcome, style }) => {
  const handleTourStart = () => {
    // Simulate a click on the 'popupWrap' before starting finstructionsthe tour
    const popupWrap = document.querySelector('.popupWrap');
    if (popupWrap) {
      popupWrap.click();
    }
    let prevClick = (drive, e, fn = false) => {
        fn && fn();
        drive.movePrevious() 
        setTimeout(() => { document.querySelector('button.driver-popover-next-btn').focus() }, 300)
    }
    let nextClick = (drive, e, fn = false) => {
        fn && fn();
        drive.moveNext()    
        setTimeout(() => { document.querySelector('button.driver-popover-next-btn').focus() }, 300)
    }
    let steps = [ 
        {
          element: '#resumeEditor > div:nth-child(1) > select',
          popover: {
            title: 'Resume',
            description:
              'Create and select resumes from here.',
            position: 'right',
            buttons: [
              {
                text: 'Close',
                className: 'driver-close-btn',
                action: () => drive.reset(),
              },
            ],
            onNextClick: (e) => nextClick(drive, e)
          },
        }, 
        { 
          popover: {
            title: 'Resume Options',
            description:
              // "Once saved, an editor will appear letting you pick pdf templates, make edits, and more.",
              "Once saved, an editor will appear letting you make edits and more.",
            position: 'bottom',
            buttons: [
              {
                text: 'Close',
                className: 'driver-close-btn',
                action: () => drive.reset(),
              },
            ],
            onNextClick: (e) => nextClick(drive, e),
            onPrevClick: (e) => prevClick(drive, e)
          },
        }, 
        {
          element: '.tab-label[for="reviewsettings"]',
          popover: {
            title: 'Settings',
            description: 'Here you can set your bio, which is used to answer job form questions, and more.',
            position: 'bottom',
            buttons: [
              {
                text: 'Close',
                className: 'driver-close-btn',
                action: () => drive.reset(),
              },
            ], 
            onNextClick: (e) => nextClick(drive, e, () => document.querySelector('.tab-label[for="reviewsettings"]').click()),
            onPrevClick: (e) => prevClick(drive, e)
          },
        },
        {
          element: '#easyjobapps',
          popover: {
            title: 'Apply for Job',
            description:
              'Click this button to apply to a job by auto filling a job form (when using the Chrome extension).',
            position: 'bottom',
            buttons: [
              {
                text: 'Close',
                className: 'driver-close-btn',
                action: () => drive.reset(),
              },
            ],
            onNextClick: (e) => nextClick(drive, e),
            // document.querySelector('.tab-label[for="reviewsettings"]').click();
            onPrevClick: (e) => prevClick(drive, e)
          },
        },
        {
          element: '#loadAndApplyContainer > div:nth-child(1)',
          popover: {
            title: 'Load Job',
            description:
              'Click here to load a job description. This will help the AI when making edits to your resume and cover letter. Use copy and paste if not on the Chrome extension.',
            position: 'bottom',
            buttons: [
              {
                text: 'Close',
                className: 'driver-close-btn',
                action: () => drive.reset(),
              },
            ],
            onNextClick: (e) => nextClick(drive, e),
            onPrevClick: (e) => prevClick(drive, e)
          },
        },
        {
          element: 'div:nth-of-type(2)[style*="display: flex"]',
          popover: {
            title: 'Credits and Sign In',
            description:
              "Having credits or a 'key' is required, sign in optional.",
            position: 'bottom',
            buttons: [
              {
                text: 'Close',
                className: 'driver-close-btn',
                action: () => drive.reset(),
              },
            ],
            onPrevClick: (e) => prevClick(drive, e)
          },
        }
      ]

    // Initialize Driver.js
    const drive = new driver({
      allowClose: true,
      overlayClickNext: true,
      animate: true,
      steps
    });

    // Start the tour
    drive.drive();
    setTimeout(() => { document.querySelector('button.driver-popover-next-btn').focus() }, 300)

    // Update the welcome state
    setShowWelcome(false);
  };

  return (
    <button onClick={handleTourStart} style={style}>
      Take a Tour
    </button>
  );
};

export default Tour;
