import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
/** 生成弹幕的位置 */
export function getDanmakuPosition(config) {
    const { data, height, lineHeight, fontSize } = config;
    /** 弹幕区域的行数 */
    const columnCount = Math.floor(height / lineHeight);
    return data
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((item, index) => ({
        data: item,
        top: (index % columnCount) * lineHeight,
        lineHeight,
        fontSize
    }));
}
/** 弹幕播放器底层 */
export function DanmakuPlayerBase(props) {
    const { period, lifetime, duration, rate = 1, threshold = 1000, loader, preload = 1, paused, current, fontSize, lineHeight, danmakuStyle, width, height, ...rest } = props;
    const [now, setNow] = useState(() => Date.now());
    const [data, setData] = useState([]);
    const storageTime = useRef(current);
    const speed = -width / lifetime;
    const translateX = useRef(new Animated.Value(speed * current)).current;
    const unmount = useRef(false);
    const tasks = useRef([]).current;
    if (storageTime.current > current || current - storageTime.current > threshold)
        setNow(Date.now());
    storageTime.current = current;
    const currentIndex = Math.floor(current / period);
    const startIndex = Math.max(Math.floor((current - lifetime) / period), 0);
    const endIndex = currentIndex + preload;
    Array(endIndex - startIndex + 1)
        .fill(0)
        .forEach((item, index) => {
        const periodIndex = startIndex + index;
        if (tasks.includes(periodIndex))
            return;
        tasks.push(periodIndex);
        loader(periodIndex * period, (periodIndex + 1) * period).then(response => {
            if (unmount.current)
                return;
            const newData = getDanmakuPosition({
                data: response,
                height,
                lineHeight,
                fontSize
            });
            setData(data => [...data, ...newData]);
        });
    });
    useEffect(() => {
        if (paused)
            return;
        console.log(rate);
        const fromValue = speed * current;
        translateX.setValue(fromValue);
        const toValue = speed * duration;
        const animation = Animated.timing(translateX, {
            toValue,
            duration: (toValue - fromValue) / speed / rate,
            useNativeDriver: true,
            easing: Easing.linear
        });
        animation.start();
        return () => animation.stop();
    }, [paused, lifetime, speed, duration, now]);
    return (<Animated.View style={{ position: "absolute", width, height, left: width, top: 0, transform: [{ translateX }] }}>
            {data
            .filter(({ data: { timestamp } }) => timestamp >= current - lifetime * 2 && timestamp <= current + lifetime * 2)
            .map(({ data, ...rest }) => (<Text key={data.id} style={[
                { position: "absolute", left: data.timestamp * -speed, ...rest },
                typeof danmakuStyle === "function" ? danmakuStyle(data) : danmakuStyle
            ]}>
                        {data.content}
                    </Text>))}
        </Animated.View>);
}
/** 弹幕播放器 */
export default function DanmakuPlayer(props) {
    const { period, lifetime, duration, rate = 1, threshold = 1000, loader, preload = 1, paused, current, fontSize, lineHeight, danmakuStyle, onLayout: _onLayout, ...rest } = props;
    const [width, setWidth] = useState(undefined);
    const [height, setHeight] = useState(undefined);
    function onLayout(event) {
        _onLayout?.(event);
        setWidth(event.nativeEvent.layout.width);
        setHeight(event.nativeEvent.layout.height);
    }
    const key = useMemo(() => Date.now(), [width, period, lifetime, duration, threshold]);
    return (<View onLayout={onLayout} {...rest}>
            {!!width && !!height && (<DanmakuPlayerBase key={key} width={width} height={height} period={period} lifetime={lifetime} duration={duration} rate={rate} threshold={threshold} loader={loader} preload={preload} paused={paused} current={current} fontSize={fontSize} lineHeight={lineHeight} danmakuStyle={danmakuStyle}/>)}
        </View>);
}
//# sourceMappingURL=index.jsx.map