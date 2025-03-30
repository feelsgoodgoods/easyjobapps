// import { Popover } from './App_Popover.js';

import React, { useState, useEffect } from 'react' 

const Popover = ({ children, id, title, onClose }) => {
  return <div className='popupWrap' onClick={onClose}>
    <div id={id} className='popupContainer' onClick={(e) => e.stopPropagation()}>
      <div syle={{display: 'flex', justifyContent: 'space-between'}}>
      <button className="remove" style={{margin:'-1rem 0px'}} type="button" onClick={onClose}>X</button>
      <h2>
        {title} 
      </h2>
      </div>
      <div className='popupContent'>
      {children}
      </div>
    </div>
  </div>
}

export { Popover }