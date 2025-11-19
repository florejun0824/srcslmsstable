import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPencilAlt,
  FaTrash,
  FaThumbtack,
  FaRegCommentDots,
} from "react-icons/fa";
import { db } from "../../services/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";

import AnnouncementModal from "../teacher/dashboard/widgets/AnnouncementModal";
import ReactionsBreakdownModal from "../teacher/dashboard/widgets/ReactionsBreakdownModal";
import UserInitialsAvatar from "./UserInitialsAvatar";

const ANNOUNCEMENT_TRUNCATE_LENGTH = 300;

// Emoji + labels
const FacebookEmoji = ({ type = "like", size = 18, className = "" }) => {
  const map = {
    like: "👍",
    heart: "❤️",
    haha: "😆",
    wow: "😮",
    sad: "😢",
    angry: "😡",
    care: "🤗",
  };
  const labelMap = {
    like: "Like",
    heart: "Love",
    haha: "Haha",
    wow: "Wow",
    sad: "Sad",
    angry: "Angry",
    care: "Care",
  };
  const emoji = map[type] || map.like;
  const label = labelMap[type] || "Like";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={className}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
    >
      {emoji}
    </span>
  );
};

const reactionIcons = {
  like: { component: (props) => <FacebookEmoji type="like" {...props} /> },
  heart: { component: (props) => <FacebookEmoji type="heart" {...props} /> },
  haha: { component: (props) => <FacebookEmoji type="haha" {...props} /> },
  wow: { component: (props) => <FacebookEmoji type="wow" {...props} /> },
  sad: { component: (props) => <FacebookEmoji type="sad" {...props} /> },
  angry: { component: (props) => <FacebookEmoji type="angry" {...props} /> },
  care: { component: (props) => <FacebookEmoji type="care" {...props} /> },
};

const AnnouncementFeed = ({
  posts,
  userProfile,
  collectionName = "teacherAnnouncements",
  showToast,
  onEdit,
  onDelete,
  onTogglePin,
}) => {
  const [expanded, setExpanded] = useState({});
  const [postReactions, setPostReactions] = useState({});
  const [usersMap, setUsersMap] = useState({});
  const [hoveredReaction, setHoveredReaction] = useState(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);
  const [reactionsForModal, setReactionsForModal] = useState(null);

  const currentUserId = userProfile?.id;

  // Sort posts (pinned first, then latest)
  const sortedPosts = useMemo(() => {
    if (!Array.isArray(posts)) return [];
    return [...posts].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dateA = a.createdAt?.toDate?.() || 0;
      const dateB = b.createdAt?.toDate?.() || 0;
      return dateB - dateA;
    });
  }, [posts]);

  // OPTIMIZED: Fetch reactions using getDocs (One-time fetch) instead of onSnapshot
  useEffect(() => {
    const fetchReactionsAndUsers = async () => {
      const newReactions = {};
      const allUserIds = new Set();

      // Gather IDs from posts first
      sortedPosts.forEach((post) => {
        if (post.teacherId) allUserIds.add(post.teacherId);
        if (post.studentId) allUserIds.add(post.studentId);
      });

      // Fetch reactions for all posts in parallel
      await Promise.all(
        sortedPosts.map(async (post) => {
          if (!post.id) return;
          try {
            const reactionsRef = collection(db, `${collectionName}/${post.id}/reactions`);
            const snapshot = await getDocs(reactionsRef);
            
            const fetchedReactions = {};
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              fetchedReactions[doc.id] = data.reactionType;
              allUserIds.add(doc.id); // Add reaction authors to user fetch list
            });
            newReactions[post.id] = fetchedReactions;
          } catch (err) {
            console.error("Error fetching reactions for post:", post.id, err);
          }
        })
      );

      setPostReactions(newReactions);
      
      // Fetch user data only for those we don't have yet
      if (allUserIds.size > 0) {
         fetchUsersData(Array.from(allUserIds));
      }
    };

    if (sortedPosts.length > 0) {
      fetchReactionsAndUsers();
    }
  }, [sortedPosts, collectionName]);

  const fetchUsersData = async (userIds) => {
    const newUsers = {};
    const idsToFetch = userIds.filter(id => !usersMap[id]);
    
    if (idsToFetch.length === 0) return;

    await Promise.all(
      idsToFetch.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            newUsers[uid] = {
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              photoURL: data.photoURL || null,
              id: uid,
            };
          } else {
            newUsers[uid] = { firstName: "Unknown", lastName: "User", id: uid };
          }
        } catch (err) {
          console.error("Error fetching user", uid, err);
          newUsers[uid] = { firstName: "Error", lastName: "User", id: uid };
        }
      })
    );
    setUsersMap((prev) => ({ ...prev, ...newUsers }));
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleReaction = async (postId, reactionType) => {
    if (!currentUserId) return showToast("Not logged in.", "error");
    
    // Optimistic UI update
    setPostReactions(prev => {
      const postReactions = { ...(prev[postId] || {}) };
      if (postReactions[currentUserId] === reactionType) {
        delete postReactions[currentUserId];
      } else {
        postReactions[currentUserId] = reactionType;
      }
      return { ...prev, [postId]: postReactions };
    });

    const ref = doc(db, `${collectionName}/${postId}/reactions`, currentUserId);
    const existing = postReactions[postId]?.[currentUserId];
    
    try {
      if (existing === reactionType) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          userId: currentUserId,
          reactionType,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      console.error("Reaction error", err);
      showToast("Failed to update reaction", "error");
    }
  };

  const formatReactions = (reactions, postId) => {
    const counts = {};
    Object.values(reactions || {}).forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    if (sorted.length === 0) return null;

    return (
      <div
        className="flex items-center space-x-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setReactionsForModal(reactions);
          setIsReactionsModalOpen(true);
        }}
        onMouseEnter={() =>
          setHoveredReaction({ id: postId, users: Object.keys(reactions) })
        }
        onMouseLeave={() => setHoveredReaction(null)}
      >
        {sorted.map(([type]) => {
          const Icon = reactionIcons[type]?.component;
          return Icon ? <Icon key={type} size={14} /> : null;
        })}
        <span className="text-xs text-gray-500">{Object.keys(reactions).length}</span>
      </div>
    );
  };

  const fadeProps = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 },
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {sortedPosts.map((post) => {
          const reactions = postReactions[post.id] || {};
          const author =
            usersMap[post.teacherId] ||
            usersMap[post.studentId] ||
            { firstName: "Unknown", lastName: "" };

          return (
            <motion.div
              key={post.id}
              {...fadeProps}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-2">
                <UserInitialsAvatar
                  name={`${author.firstName} ${author.lastName}`}
                  photoURL={author.photoURL}
                  size={40}
                />
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {author.firstName} {author.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {post.createdAt?.toDate
                      ? post.createdAt.toDate().toLocaleString()
                      : ""}
                  </p>
                </div>
                {post.isPinned && (
                  <FaThumbtack className="ml-auto text-rose-500" title="Pinned" />
                )}
              </div>

              <div
                className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap cursor-pointer"
                onClick={() => {
                  setSelectedAnnouncement(post);
                  setIsAnnouncementModalOpen(true);
                }}
              >
                {post.content?.length > ANNOUNCEMENT_TRUNCATE_LENGTH &&
                !expanded[post.id] ? (
                  <>
                    {post.content.slice(0, ANNOUNCEMENT_TRUNCATE_LENGTH)}...
                    <button
                      className="text-blue-600 ml-1 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(post.id);
                      }}
                    >
                      See more
                    </button>
                  </>
                ) : (
                  <>
                    {post.content}
                    {post.content?.length > ANNOUNCEMENT_TRUNCATE_LENGTH && (
                      <button
                        className="text-blue-600 ml-1 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(post.id);
                        }}
                      >
                        See less
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <button
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 text-sm flex items-center gap-1"
                    onClick={() => toggleReaction(post.id, "like")}
                  >
                    <FacebookEmoji type="like" size={16} /> Like
                  </button>
                  <button
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 text-sm flex items-center gap-1"
                    onClick={() => {
                      setSelectedAnnouncement(post);
                      setIsAnnouncementModalOpen(true);
                    }}
                  >
                    <FaRegCommentDots /> Comment
                  </button>
                </div>
                {formatReactions(reactions, post.id)}
              </div>

              {(userProfile?.id === post.teacherId ||
                userProfile?.role === "admin") && (
                <div className="flex justify-end mt-2 space-x-2 text-gray-400">
                  {onTogglePin && (
                    <button onClick={() => onTogglePin(post.id)}>
                      <FaThumbtack />
                    </button>
                  )}
                  {onEdit && (
                    <button onClick={() => onEdit(post.id, post.content)}>
                      <FaPencilAlt />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(post.id)}>
                      <FaTrash />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Announcement Modal */}
      {isAnnouncementModalOpen && (
        <AnnouncementModal
          isOpen={isAnnouncementModalOpen}
          onClose={() => setIsAnnouncementModalOpen(false)}
          announcement={selectedAnnouncement}
        />
      )}

      {/* Reactions Breakdown Modal */}
      {isReactionsModalOpen && (
        <ReactionsBreakdownModal
          isOpen={isReactionsModalOpen}
          onClose={() => setIsReactionsModalOpen(false)}
          reactions={reactionsForModal}
          usersMap={usersMap}
        />
      )}
    </div>
  );
};

export default AnnouncementFeed;