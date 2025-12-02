// East-West System SVG rendering function with 3D perspective
const renderEastWestSystemSVG = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <style>
        {`.roof{fill:#777;stroke:#333;stroke-width:2}
          .panel-east{fill:#204887;stroke:#000;stroke-width:1}
          .panel-west{fill:#163256;stroke:#000;stroke-width:1}
          .panel-edge{fill:none;stroke:#000;stroke-width:1.5}
          .ridge-gap{stroke:#00AA00;stroke-width:3;stroke-dasharray:5,3}
          .valley-gap{stroke:#FF6600;stroke-width:3;stroke-dasharray:5,3}
          .module-gap{stroke:#9900CC;stroke-width:3;stroke-dasharray:5,3}
          .panel-width{stroke:#ff0000;stroke-width:3;stroke-dasharray:5,3}
          .panel-length{stroke:#0000ff;stroke-width:3;stroke-dasharray:5,3}
          .panel-grid{stroke:#fff;stroke-width:0.8;stroke-opacity:0.9}
          .hidden{display:none}
          
          text {
            font-family: Arial, sans-serif;
          }`}
      </style>
      
      {/* Background roof */}
      <rect x="100" y="490" width="600" height="30" className="roof" />
      
      {/* Z-AXIS SYSTEM - TOP VIEW (Module Gapping) */}
      <g>
        {/* East-West System from Top View (Z-axis) */}
        <rect x="230" y="40" width="340" height="60" fill="#204887" stroke="#000" strokeWidth="1.5" />
        
        {/* Module dividers */}
        <line x1="400" y1="40" x2="400" y2="100" stroke="#000" strokeWidth="7.5" />
        
        {/* Module Gapping */}
        <line x1="395" y1="105" x2="405" y2="105" className={`module-gap ${!props.visiblePaths.moduleGap ? "hidden" : ""}`} />
        <text x="405" y="120" fill="#9900CC" fontWeight="bold" fontSize="14" className={!props.visiblePaths.moduleGap ? "hidden" : ""}>Module Gap</text>
        
        {/* Grid lines for modules */}
        <line x1="230" y1="55" x2="395" y2="55" className="panel-grid" />
        <line x1="230" y1="70" x2="395" y2="70" className="panel-grid" />
        <line x1="230" y1="85" x2="395" y2="85" className="panel-grid" />

        <line x1="260" y1="40" x2="260" y2="100" className="panel-grid" />
        <line x1="290" y1="40" x2="290" y2="100" className="panel-grid" />
        <line x1="320" y1="40" x2="320" y2="100" className="panel-grid" />
        <line x1="350" y1="40" x2="350" y2="100" className="panel-grid" />
        <line x1="380" y1="40" x2="380" y2="100" className="panel-grid" />
        
        <line x1="405" y1="55" x2="570" y2="55" className="panel-grid" />
        <line x1="405" y1="70" x2="570" y2="70" className="panel-grid" />
        <line x1="405" y1="85" x2="570" y2="85" className="panel-grid" />

        <line x1="420" y1="40" x2="420" y2="100" className="panel-grid" />
        <line x1="450" y1="40" x2="450" y2="100" className="panel-grid" />
        <line x1="480" y1="40" x2="480" y2="100" className="panel-grid" />
        <line x1="510" y1="40" x2="510" y2="100" className="panel-grid" />
        <line x1="540" y1="40" x2="540" y2="100" className="panel-grid" />
      </g>
      
      {/* FIRST SYSTEM (LEFT) - MODIFIED DIMENSIONS */}
      <g>
        {/* East panel (left) - WIDER and SHORTER */}
        <polygon points="200,380 330,300 330,140 200,220" className="panel-east" />
        
        {/* Grid lines for East panel - Horizontal */}
        <line x1="200" y1="380" x2="330" y2="300" className="panel-grid" />
        <line x1="200" y1="356" x2="330" y2="276" className="panel-grid" />
        <line x1="200" y1="332" x2="330" y2="252" className="panel-grid" />
        <line x1="200" y1="308" x2="330" y2="228" className="panel-grid" />
        <line x1="200" y1="284" x2="330" y2="204" className="panel-grid" />
        <line x1="200" y1="260" x2="330" y2="180" className="panel-grid" />
        <line x1="200" y1="236" x2="330" y2="156" className="panel-grid" />
        
        {/* Grid lines for East panel - Vertical */}
        <line x1="226" y1="367" x2="226" y2="207" className="panel-grid" />
        <line x1="252" y1="344" x2="252" y2="184" className="panel-grid" />
        <line x1="278" y1="331" x2="278" y2="171" className="panel-grid" />
        <line x1="304" y1="318" x2="304" y2="158" className="panel-grid" />
        
        {/* West panel (right) - WIDER and SHORTER */}
        <polygon points="330,300 460,380 460,220 330,140" className="panel-west" />
        
        {/* Grid lines for West panel - Horizontal */}
        <line x1="330" y1="300" x2="460" y2="380" className="panel-grid" />
        <line x1="330" y1="276" x2="460" y2="356" className="panel-grid" />
        <line x1="330" y1="252" x2="460" y2="332" className="panel-grid" />
        <line x1="330" y1="228" x2="460" y2="308" className="panel-grid" />
        <line x1="330" y1="204" x2="460" y2="284" className="panel-grid" />
        <line x1="330" y1="180" x2="460" y2="260" className="panel-grid" />
        <line x1="330" y1="156" x2="460" y2="236" className="panel-grid" />
        
        {/* Grid lines for West panel - Vertical */}
        <line x1="356" y1="313" x2="356" y2="153" className="panel-grid" />
        <line x1="382" y1="326" x2="382" y2="166" className="panel-grid" />
        <line x1="408" y1="339" x2="408" y2="179" className="panel-grid" />
        <line x1="434" y1="352" x2="434" y2="192" className="panel-grid" />
        
        {/* Panel Edges */}
        <line x1="200" y1="220" x2="330" y2="140" className="panel-edge" />
        <line x1="330" y1="140" x2="460" y2="220" className="panel-edge" />
        <line x1="200" y1="380" x2="200" y2="220" className="panel-edge" />
        <line x1="330" y1="300" x2="330" y2="140" className="panel-edge" />
        <line x1="460" y1="380" x2="460" y2="220" className="panel-edge" />
        
        {/* Ridge Gap */}
        <line x1="330" y1="230" x2="330" y2="270" className={`ridge-gap ${!props.visiblePaths.ridgeGap ? "hidden" : ""}`} />
        <text x="295" y="250" fill="#00AA00" fontWeight="bold" fontSize="14" className={!props.visiblePaths.ridgeGap ? "hidden" : ""}>Ridge Gap</text>
        
        {/* Valley Gap */}
        <line x1="500" y1="380" x2="460" y2="380" className={`valley-gap ${!props.visiblePaths.valleyGap ? "hidden" : ""}`} />
        <text x="430" y="400" fill="#FF6600" fontWeight="bold" fontSize="14" className={!props.visiblePaths.valleyGap ? "hidden" : ""}>Valley Gap</text>
        
        {/* Panel Width - Now showing the longer vertical dimension */}
        <line x1="330" y1="300" x2="330" y2="140" className={`panel-width ${!props.visiblePaths.panelWidth ? "hidden" : ""}`} />
        <text x="345" y="220" fill="#ff0000" fontWeight="bold" fontSize="14" className={!props.visiblePaths.panelWidth ? "hidden" : ""}>Width (6ft)</text>
        
        {/* Panel Length - Now showing the shorter horizontal dimension */}
        <line x1="330" y1="300" x2="460" y2="380" className={`panel-length ${!props.visiblePaths.panelLength ? "hidden" : ""}`} />
        <text x="380" y="350" fill="#0000ff" fontWeight="bold" fontSize="14" className={!props.visiblePaths.panelLength ? "hidden" : ""}>Length (3ft)</text>
      </g>
      
      {/* SECOND SYSTEM (RIGHT) - MODIFIED DIMENSIONS */}
      <g>
        {/* East panel (left) - WIDER and SHORTER */}
        <polygon points="500,380 630,300 630,140 500,220" className="panel-east" />
        
        {/* Grid lines for East panel - Horizontal */}
        <line x1="500" y1="380" x2="630" y2="300" className="panel-grid" />
        <line x1="500" y1="356" x2="630" y2="276" className="panel-grid" />
        <line x1="500" y1="332" x2="630" y2="252" className="panel-grid" />
        <line x1="500" y1="308" x2="630" y2="228" className="panel-grid" />
        <line x1="500" y1="284" x2="630" y2="204" className="panel-grid" />
        <line x1="500" y1="260" x2="630" y2="180" className="panel-grid" />
        <line x1="500" y1="236" x2="630" y2="156" className="panel-grid" />
        
        {/* Grid lines for East panel - Vertical */}
        <line x1="526" y1="367" x2="526" y2="207" className="panel-grid" />
        <line x1="552" y1="344" x2="552" y2="184" className="panel-grid" />
        <line x1="578" y1="331" x2="578" y2="171" className="panel-grid" />
        <line x1="604" y1="318" x2="604" y2="158" className="panel-grid" />
        
        {/* West panel (right) - WIDER and SHORTER */}
        <polygon points="630,300 760,380 760,220 630,140" className="panel-west" />
        
        {/* Grid lines for West panel - Horizontal */}
        <line x1="630" y1="300" x2="760" y2="380" className="panel-grid" />
        <line x1="630" y1="276" x2="760" y2="356" className="panel-grid" />
        <line x1="630" y1="252" x2="760" y2="332" className="panel-grid" />
        <line x1="630" y1="228" x2="760" y2="308" className="panel-grid" />
        <line x1="630" y1="204" x2="760" y2="284" className="panel-grid" />
        <line x1="630" y1="180" x2="760" y2="260" className="panel-grid" />
        <line x1="630" y1="156" x2="760" y2="236" className="panel-grid" />
        
        {/* Grid lines for West panel - Vertical */}
        <line x1="656" y1="313" x2="656" y2="153" className="panel-grid" />
        <line x1="682" y1="326" x2="682" y2="166" className="panel-grid" />
        <line x1="708" y1="339" x2="708" y2="179" className="panel-grid" />
        <line x1="734" y1="352" x2="734" y2="192" className="panel-grid" />
        
        {/* Panel Edges */}
        <line x1="500" y1="220" x2="630" y2="140" className="panel-edge" />
        <line x1="630" y1="140" x2="760" y2="220" className="panel-edge" />
        <line x1="500" y1="380" x2="500" y2="220" className="panel-edge" />
        <line x1="630" y1="300" x2="630" y2="140" className="panel-edge" />
        <line x1="760" y1="380" x2="760" y2="220" className="panel-edge" />
      </g>
      
      {/* Diagram Title */}
      <text x="400" y="30" fontSize="24" fontWeight="bold" textAnchor="middle">East-West Solar Panel System</text>
      
      {/* Legend */}
      <g transform="translate(80, 180)">
        <rect x="0" y="0" width="180" height="160" fill="white" stroke="black" strokeWidth="1.5" rx="5" ry="5" />
        <text x="10" y="25" fontWeight="bold" fontSize="16">Legend:</text>
        
        <line x1="10" y1="45" x2="50" y2="45" className="ridge-gap" />
        <text x="60" y="50" fontSize="14">Ridge Gap</text>
        
        <line x1="10" y1="70" x2="50" y2="70" className="valley-gap" />
        <text x="60" y="75" fontSize="14">Valley Gap</text>
        
        <line x1="10" y1="95" x2="50" y2="95" className="module-gap" />
        <text x="60" y="100" fontSize="14">Module Gap</text>
        
        <line x1="10" y1="120" x2="50" y2="120" className="panel-length" />
        <text x="60" y="125" fontSize="14">Panel Length (3ft)</text>
        
        <line x1="10" y1="145" x2="50" y2="145" className="panel-width" />
        <text x="60" y="150" fontSize="14">Panel Width (6ft)</text>
      </g>
      
      {/* Key Features */}
      <g transform="translate(540, 180)">
        <rect x="0" y="0" width="180" height="120" fill="white" stroke="black" strokeWidth="1.5" rx="5" ry="5" />
        <text x="10" y="25" fontWeight="bold" fontSize="16">Key Features:</text>
        
        <rect x="10" y="40" width="20" height="15" className="panel-east" />
        <text x="40" y="52" fontSize="14">East-facing panel</text>
        
        <rect x="10" y="65" width="20" height="15" className="panel-west" />
        <text x="40" y="77" fontSize="14">West-facing panel</text>
        
        <line x1="10" y1="95" x2="30" y2="95" className="panel-grid" strokeWidth="1.5" />
        <text x="40" y="100" fontSize="14">Solar cells</text>
      </g>
      
      {/* Labels */}
      <text x="230" y="410" textAnchor="middle" fontSize="14">East-facing</text>
      <text x="330" y="410" textAnchor="middle" fontSize="14">Ridge</text>
      <text x="430" y="410" textAnchor="middle" fontSize="14">West-facing</text>
      
      <text x="530" y="410" textAnchor="middle" fontSize="14">East-facing</text>
      <text x="630" y="410" textAnchor="middle" fontSize="14">Ridge</text>
      <text x="730" y="410" textAnchor="middle" fontSize="14">West-facing</text>
      
      <text x="400" y="510" textAnchor="middle" fontSize="16" fontWeight="bold">East-West Configuration</text>
    </svg>
  );
};

// Update the PanelSVG component to use the 3D East-West rendering function
const PanelSVG = (props) => {
  // If system type is east-west, render the east-west diagram
  if (props.systemType === "east-west-system") {
    return renderEastWestSystemSVG(props);
  }
  
  // Otherwise, render the original south-facing diagram
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1352 750"
      className={props.className}
    >
      <style>
        {".a{fill:#001e59}.b{fill:none;stroke:#f5f5f5}.c{fill:#f2a900;}"}
      </style>
      <path className="a" d="m61 63h600v300h-600z" />
      <path className="b" d="m61.5 363v-300" />
      <path className="b" d="m361 363v-300" />
      <path className="b" d="m660.5 363v-300" />
      <path className="b" d="m617.6 363v-300" />
      <path className="b" d="m574.6 363v-300" />
      <path className="b" d="m531.7 363v-300" />
      <path className="b" d="m489.8 363v-300" />
      <path className="b" d="m446.9 363v-300" />
      <path className="b" d="m403.9 363v-300" />
      <path className="b" d="m318.1 363v-300" />
      <path className="b" d="m275.1 363v-300" />
      <path className="b" d="m232.2 363v-300" />
      <path className="b" d="m190.3 363v-300" />
      <path className="b" d="m147.4 363v-300" />
      <path className="b" d="m104.4 363v-300" />
      <path className="b" d="m62 105.5h599" />
      <path className="b" d="m62 277.5h596" />
      <path className="b" d="m62 320.5h599" />
      <path className="b" d="m62 362.5h599" />
      <path className="b" d="m66 62.5h595" />
      <path className="b" d="m62 234.5h596" />
      <path className="b" d="m62 191.5h599" />
      <path className="b" d="m62 148.5h596" />
      <path className="a" d="m61 63h600v300h-600z" />
      <path className="b" d="m61.5 363v-300" />
      <path className="b" d="m361 363v-300" />
      <path className="b" d="m660.5 363v-300" />
      <path className="b" d="m617.6 363v-300" />
      <path className="b" d="m574.6 363v-300" />
      <path className="b" d="m531.7 363v-300" />
      <path className="b" d="m489.8 363v-300" />
      <path className="b" d="m446.9 363v-300" />
      <path className="b" d="m403.9 363v-300" />
      <path className="b" d="m318.1 363v-300" />
      <path className="b" d="m275.1 363v-300" />
      <path className="b" d="m232.2 363v-300" />
      <path className="b" d="m190.3 363v-300" />
      <path className="b" d="m147.4 363v-300" />
      <path className="b" d="m104.4 363v-300" />
      <path className="b" d="m62 105.5h599" />
      <path className="b" d="m62 277.5h596" />
      <path className="b" d="m62 320.5h599" />
      <path className="b" d="m62 362.5h599" />
      <path className="b" d="m66 62.5h595" />
      <path className="b" d="m62 234.5h596" />
      <path className="b" d="m62 191.5h599" />
      <path className="b" d="m62 148.5h596" />
      <path className="a" d="m61 413h600v300h-600z" />
      <path className="b" d="m61.5 713v-300" />
      <path className="b" d="m361 713v-300" />
      <path className="b" d="m660.5 713v-300" />
      <path className="b" d="m617.6 713v-300" />
      <path className="b" d="m574.6 713v-300" />
      <path className="b" d="m531.7 713v-300" />
      <path className="b" d="m489.8 713v-300" />
      <path className="b" d="m446.9 713v-300" />
      <path className="b" d="m403.9 713v-300" />
      <path className="b" d="m318.1 713v-300" />
      <path className="b" d="m275.1 713v-300" />
      <path className="b" d="m232.2 713v-300" />
      <path className="b" d="m190.3 713v-300" />
      <path className="b" d="m147.4 713v-300" />
      <path className="b" d="m104.4 713v-300" />
      <path className="b" d="m62 455.5h599" />
      <path className="b" d="m62 627.5h596" />
      <path className="b" d="m62 670.5h599" />
      <path className="b" d="m62 712.5h599" />
      <path className="b" d="m66 412.5h595" />
      <path className="b" d="m62 584.5h596" />
      <path className="b" d="m62 541.5h599" />
      <path className="b" d="m62 498.5h596" />
      <path className="a" d="m711 413h600v300h-600z" />
      <path className="b" d="m711.5 713v-300" />
      <path className="b" d="m1011 713v-300" />
      <path className="b" d="m1310.5 713v-300" />
      <path className="b" d="m1267.6 713v-300" />
      <path className="b" d="m1224.6 713v-300" />
      <path className="b" d="m1181.7 713v-300" />
      <path className="b" d="m1139.8 713v-300" />
      <path className="b" d="m1096.9 713v-300" />
      <path className="b" d="m1053.9 713v-300" />
      <path className="b" d="m968.1 713v-300" />
      <path className="b" d="m925.1 713v-300" />
      <path className="b" d="m882.2 713v-300" />
      <path className="b" d="m840.3 713v-300" />
      <path className="b" d="m797.4 713v-300" />
      <path className="b" d="m754.4 713v-300" />
      <path className="b" d="m712 455.5h599" />
      <path className="b" d="m712 627.5h596" />
      <path className="b" d="m712 670.5h599" />
      <path className="b" d="m712 712.5h599" />
      <path className="b" d="m716 412.5h595" />
      <path className="b" d="m712 584.5h596" />
      <path className="b" d="m712 541.5h599" />
      <path className="b" d="m712 498.5h596" />
      <path className="a" d="m711 63h600v300h-600z" />
      <path className="b" d="m711.5 363v-300" />
      <path className="b" d="m1011 363v-300" />
      <path className="b" d="m1310.5 363v-300" />
      <path className="b" d="m1267.6 363v-300" />
      <path className="b" d="m1224.6 363v-300" />
      <path className="b" d="m1181.7 363v-300" />
      <path className="b" d="m1139.8 363v-300" />
      <path className="b" d="m1096.9 363v-300" />
      <path className="b" d="m1053.9 363v-300" />
      <path className="b" d="m968.1 363v-300" />
      <path className="b" d="m925.1 363v-300" />
      <path className="b" d="m882.2 363v-300" />
      <path className="b" d="m840.3 363v-300" />
      <path className="b" d="m797.4 363v-300" />
      <path className="b" d="m754.4 363v-300" />
      <path className="b" d="m712 105.5h599" />
      <path className="b" d="m712 277.5h596" />
      <path className="b" d="m712 320.5h599" />
      <path className="b" d="m712 362.5h599" />
      <path className="b" d="m716 62.5h595" />
      <path className="b" d="m712 234.5h596" />
      <path className="b" d="m712 191.5h599" />
      <path className="b" d="m712 148.5h596" />
      <path
        className={`c panel-width ${
          !props.visiblePaths.panelWidth ? "hidden" : ""
        }`}
        d="m662.1 52.1c0.5-0.6 0.5-1.6 0-2.2l-9.6-9.5c-0.6-0.6-1.5-0.6-2.1 0-0.6 0.6-0.6 1.5 0 2.1l8.5 8.5-8.5 8.5c-0.6 0.6-0.6 1.5 0 2.1 0.6 0.6 1.5 0.6 2.1 0zm-301.6 0.4h300.6v-3h-300.6z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      <path
        className={`c panel-width ${
          !props.visiblePaths.panelWidth ? "hidden" : ""
        }`}
        d="m64.9 49.9c-0.5 0.6-0.5 1.6 0 2.2l9.6 9.5c0.6 0.6 1.5 0.6 2.1 0 0.6-0.6 0.6-1.5 0-2.1l-8.5-8.5 8.5-8.5c0.6-0.6 0.6-1.5 0-2.1-0.6-0.6-1.5-0.6-2.1 0zm301.6-0.4h-300.6v3h300.6z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      <path
        className={`c panel-length ${
          !props.visiblePaths.panelLength ? "hidden" : ""
        }`}
        d="m48.9 361.1c0.6 0.5 1.6 0.5 2.2 0l9.5-9.6c0.6-0.6 0.6-1.5 0-2.1-0.6-0.6-1.5-0.6-2.1 0l-8.5 8.5-8.5-8.5c-0.6-0.6-1.5-0.6-2.1 0-0.6 0.6-0.6 1.5 0 2.1zm-0.4-150v149h3v-149z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      <path
        className={`c panel-length ${
          !props.visiblePaths.panelLength ? "hidden" : ""
        }`}
        d="m51.1 63.9c-0.6-0.5-1.6-0.5-2.2 0l-9.5 9.6c-0.6 0.6-0.6 1.5 0 2.1 0.6 0.6 1.5 0.6 2.1 0l8.5-8.5 8.5 8.5c0.6 0.6 1.5 0.6 2.1 0 0.6-0.6 0.6-1.5 0-2.1zm0.4 150v-149h-3v149z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      <path
        className={`c module-gap ${
          !props.visiblePaths.moduleGap ? "hidden" : ""
        }`}
        d="m659.9 698.9c-0.5 0.6-0.5 1.6 0 2.2l9.6 9.5c0.6 0.6 1.5 0.6 2.1 0 0.6-0.6 0.6-1.5 0-2.1l-8.5-8.5 8.5-8.5c0.6-0.6 0.6-1.5 0-2.1-0.6-0.6-1.5-0.6-2.1 0zm31-0.4h-30v3h30z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      <path
        className={`c module-gap ${
          !props.visiblePaths.moduleGap ? "hidden" : ""
        }`}
        d="m712.1 701.1c0.5-0.6 0.5-1.6 0-2.2l-9.6-9.5c-0.6-0.6-1.5-0.6-2.1 0-0.6 0.6-0.6 1.5 0 2.1l8.5 8.5-8.5 8.5c-0.6 0.6-0.6 1.5 0 2.1 0.6 0.6 1.5 0.6 2.1 0zm-31 0.4h30v-3h-30z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      <path
        className={`c row-gap ${
          !props.visiblePaths.rowGap ? "hidden" : ""
        }`}
        d="m1300.9 414.1c0.6 0.5 1.6 0.5 2.2 0l9.5-9.6c0.6-0.6 0.6-1.5 0-2.1-0.6-0.6-1.5-0.6-2.1 0l-8.5 8.5-8.5-8.5c-0.6-0.6-1.5-0.6-2.1 0-0.6 0.6-0.6 1.5 0 2.1zm-0.5-31v30h3v-30z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      <path
        className={`c row-gap ${
          !props.visiblePaths.rowGap ? "hidden" : ""
        }`}
        d="m1303.1 361.9c-0.6-0.5-1.6-0.5-2.2 0l-9.5 9.6c-0.6 0.6-0.6 1.5 0 2.1 0.6 0.6 1.5 0.6 2.1 0l8.5-8.5 8.5 8.5c0.6 0.6 1.5 0.6 2.1 0 0.6-0.6 0.6-1.5 0-2.1zm0.5 31v-30h-3v30z"
        stroke="#ff0000"
        strokeWidth="3"
      />
      
      {/* Add a title for the south-facing system */}
      <text x="675" y="730" textAnchor="middle" fontSize="20" fontWeight="bold">
        South Face System Configuration
      </text>
    </svg>
  );
};
export default PanelSVG;