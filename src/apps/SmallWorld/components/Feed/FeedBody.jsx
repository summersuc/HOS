import React from 'react';

// 解析内容中的话题和@用户
const parseContent = (text) => {
    if (!text) return null;

    // 匹配 #话题# 和 @用户名
    const regex = /(#[^#]+#|@[\w\u4e00-\u9fa5]+)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
        if (part.startsWith('#') && part.endsWith('#')) {
            return <span key={index} className="sw-hashtag">{part}</span>;
        }
        if (part.startsWith('@')) {
            return <span key={index} className="sw-mention">{part}</span>;
        }
        return part;
    });
};

const ImageGrid = ({ images }) => {
    if (!images || images.length === 0) return null;

    const count = images.length;

    // 单图
    if (count === 1) {
        return (
            <div className="sw-image-grid single">
                <img
                    src={images[0]}
                    className="sw-single-image"
                    alt=""
                    loading="lazy"
                />
            </div>
        );
    }

    // 两图
    if (count === 2) {
        return (
            <div className="sw-image-grid double">
                {images.map((img, i) => (
                    <img key={i} src={img} className="sw-grid-image" alt="" loading="lazy" />
                ))}
            </div>
        );
    }

    // 四图 - 2x2
    if (count === 4) {
        return (
            <div className="sw-image-grid quad">
                {images.map((img, i) => (
                    <img key={i} src={img} className="sw-grid-image" alt="" loading="lazy" />
                ))}
            </div>
        );
    }

    // 其他 - 3列网格
    return (
        <div className="sw-image-grid multi">
            {images.slice(0, 9).map((img, i) => (
                <img key={i} src={img} className="sw-grid-image" alt="" loading="lazy" />
            ))}
        </div>
    );
};

const FeedBody = ({ content, images, isRepost }) => {
    return (
        <div className="sw-feed-body">
            {/* 富文本内容 */}
            {content && (
                <p className="sw-content-text">
                    {parseContent(content)}
                </p>
            )}

            {/* 图片区域 */}
            <ImageGrid images={images} />
        </div>
    );
};

export default FeedBody;
