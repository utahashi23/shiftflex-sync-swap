
// When creating SwapMatch objects for displaying
const createSwapMatchCard = (match: MatchTestResult) => {
  const shift1 = match.request1Shift;
  const shift2 = match.request2Shift;
  
  if (!shift1 || !shift2) return null;
  
  const user1 = match.request1User;
  const user2 = match.request2User;
  
  return {
    id: `potential-${match.request1Id}-${match.request2Id}`,
    status: 'potential',
    myShift: {
      id: shift1.id,
      date: shift1.date,
      startTime: shift1.start_time,
      endTime: shift1.end_time,
      truckName: shift1.truck_name,
      type: getShiftType(shift1.start_time),
      colleagueType: shift1.colleague_type || 'Unknown'
    },
    otherShift: {
      id: shift2.id,
      date: shift2.date,
      startTime: shift2.start_time,
      endTime: shift2.end_time,
      truckName: shift2.truck_name,
      type: getShiftType(shift2.start_time),
      userId: shift2.user_id,
      userName: user2 ? `${user2.first_name} ${user2.last_name}` : 'Unknown User',
      colleagueType: shift2.colleague_type || 'Unknown'
    },
    myRequestId: match.request1Id,
    otherRequestId: match.request2Id,
    createdAt: new Date().toISOString()
  };
};
