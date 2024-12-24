import  { useState } from 'react';

const Button = () => {

    const [count, setCount] = useState(100);
    const [like, setLike] = useState(false);
    const [text, setText] = useState("Like");

    const handleClick = () => {
        if (like) {
            setCount(count - 1);
            setLike(false);
            setText("Like");
          } else {
            setCount(count + 1);
            setLike(true);
            setText("Liked");
          }
}

    return (
        <div>
            <button onClick={()=> handleClick()}>{text}</button>
            <span id='text'>{count}</span>
        </div>
    );
}

export default Button;