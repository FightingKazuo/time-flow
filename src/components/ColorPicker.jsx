import { PRESET_COLORS } from "../constants";

export default function ColorPicker({ value, onChange }) {
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
      {PRESET_COLORS.map(c=>(
        <div key={c} onClick={()=>onChange(c)} style={{
          width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",
          border:value===c?"3px solid #fff":"3px solid transparent",
          boxSizing:"border-box",
        }}/>
      ))}
    </div>
  );
}
