import React from 'react';
import Post from './Post';
import { useSmallWorld } from '../../data/SmallWorldContext';

const FeedList = () => {
    const { posts } = useSmallWorld();

    return (
        <div className="pb-20">
            {posts.map(post => (
                <Post key={post.id} post={post} />
            ))}
        </div>
    );
};

export default FeedList;
